import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Resume } from '../../database/entities/resume.entity';
import { ResumeVersion } from '../../database/entities/resume-version.entity';
import { User } from '../../database/entities/user.entity';
import { FileParserService } from './services/file-parser.service';
import { FileValidationService } from './services/file-validation.service';
import { QueueService } from '../../queues/queue.service';

@Injectable()
export class ResumeAnalysisService {
  constructor(
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
    @InjectRepository(ResumeVersion)
    private resumeVersionRepository: Repository<ResumeVersion>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private fileParserService: FileParserService,
    private fileValidationService: FileValidationService,
    private queueService: QueueService,
  ) {}

  async processUpload(file: Express.Multer.File, userId: string) {
    // Ensure user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Parse the file
      const parsedContent = await this.fileParserService.parseFile(file.path, file.mimetype);
      const cleanedText = this.fileParserService.cleanText(parsedContent.text);
      const extractedMetadata = this.fileParserService.extractMetadata(cleanedText);

      // Create resume record
      const resume = this.resumeRepository.create({
        userId,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        content: cleanedText,
        parsedContent: {
          ...parsedContent.metadata,
          extractedInfo: extractedMetadata,
        },
        isProcessed: false,
      });

      const savedResume = await this.resumeRepository.save(resume);

      // Create version record
      const version = this.resumeVersionRepository.create({
        resumeId: savedResume.id,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        content: cleanedText,
        parsedContent: savedResume.parsedContent,
        versionNumber: 1,
      });

      await this.resumeVersionRepository.save(version);

      // Move file to permanent storage
      const permanentDir = this.fileValidationService.ensureUploadDirectory();
      const permanentPath = path.join(permanentDir, 'resumes', 
        this.fileValidationService.generateSecureFileName(file.originalname, userId));
      
      fs.renameSync(file.path, permanentPath);

      // Queue for AI analysis
      await this.queueService.addResumeAnalysisJob({
        resumeId: savedResume.id,
        userId,
        fileContent: fs.readFileSync(permanentPath),
        provider: 'gemini', // Primary provider as per memory
      });

      // Clean up temp file if it still exists
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return {
        resumeId: savedResume.id,
        message: 'Resume uploaded successfully and queued for analysis',
        status: 'processing',
      };

    } catch (error: any) {
      // Clean up temp file on error
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException(`Failed to process resume: ${error?.message || 'Unknown error'}`);
    }
  }

  async getAnalysis(resumeId: string, userId: string) {
    const resume = await this.resumeRepository.findOne({
      where: { id: resumeId, userId },
      relations: ['versions'],
    });

    if (!resume) {
      throw new NotFoundException('Resume analysis not found');
    }

    return {
      id: resume.id,
      fileName: resume.fileName,
      uploadedAt: resume.uploadedAt,
      isProcessed: resume.isProcessed,
      atsScore: resume.atsScore,
      suggestions: resume.suggestions,
      parsedContent: resume.parsedContent,
      versions: resume.versions?.length || 0,
    };
  }

  async getUserResumes(userId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [resumes, total] = await this.resumeRepository.findAndCount({
      where: { userId },
      order: { uploadedAt: 'DESC' },
      skip,
      take: limit,
      select: ['id', 'fileName', 'uploadedAt', 'isProcessed', 'atsScore'],
    });

    return {
      resumes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async processBulkUpload(files: Express.Multer.File[], userId: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided for bulk upload');
    }

    const batchId = `bulk_${Date.now()}_${userId}`;
    const validFiles: Express.Multer.File[] = [];

    // Validate all files first
    for (const file of files) {
      const validation = this.fileValidationService.validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      throw new BadRequestException('No valid files found in bulk upload');
    }

    // Queue bulk analysis job
    await this.queueService.addBulkAnalysisJob({
      batchId,
      userId,
      resumeFiles: validFiles.map(file => ({
        id: `${file.originalname}_${Date.now()}`,
        content: fs.readFileSync(file.path),
        fileName: file.originalname,
      })),
      provider: 'gemini',
    });

    // Clean up temp files
    for (const file of files) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    return {
      batchId,
      totalFiles: validFiles.length,
      message: 'Bulk upload queued for processing',
      status: 'queued',
    };
  }

  async updateAnalysisResults(resumeId: string, results: any) {
    const resume = await this.resumeRepository.findOne({ where: { id: resumeId } });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    await this.resumeRepository.update(resumeId, {
      atsScore: results.atsScore,
      suggestions: results.suggestions,
      isProcessed: true,
      parsedContent: {
        ...resume.parsedContent,
        analysisResults: results,
      },
    });

    return { success: true };
  }

  async enforceVersionRetention(userId: string): Promise<{ deletedVersions: number }> {
    // Get all resumes for user
    const resumes = await this.resumeRepository.find({
      where: { userId },
      relations: ['versions'],
    });

    let totalDeleted = 0;

    for (const resume of resumes) {
      const versions = await this.resumeVersionRepository.find({
        where: { resumeId: resume.id },
        order: { createdAt: 'DESC' },
      });

      // Keep only the last 10 versions as per memory specification
      if (versions.length > 10) {
        const versionsToDelete = versions.slice(10);
        const versionIds = versionsToDelete.map(v => v.id);
        
        await this.resumeVersionRepository.delete(versionIds);
        totalDeleted += versionsToDelete.length;
      }
    }

    return { deletedVersions: totalDeleted };
  }
}