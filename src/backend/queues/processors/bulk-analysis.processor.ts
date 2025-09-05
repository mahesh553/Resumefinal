import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resume } from '../../database/entities/resume.entity';
import { ResumeVersion } from '../../database/entities/resume-version.entity';
import { FileParserService } from '../../modules/resume-analysis/services/file-parser.service';
import { AIProviderService } from '../../modules/ai/services/ai-provider.service';
import { QUEUE_NAMES } from '../queue.types';
import type { BulkResumeAnalysisJob } from '../queue.types';

@Injectable()
@Processor(QUEUE_NAMES.BULK_ANALYSIS)
export class BulkAnalysisProcessor {
  private readonly logger = new Logger(BulkAnalysisProcessor.name);

  constructor(
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
    @InjectRepository(ResumeVersion)
    private resumeVersionRepository: Repository<ResumeVersion>,
    private fileParserService: FileParserService,
    private aiProviderService: AIProviderService,
  ) {}

  @Process('bulk-analyze')
  async handleBulkAnalysis(job: Job<BulkResumeAnalysisJob>) {
    const { batchId, userId, resumeFiles, provider } = job.data;
    
    this.logger.log(`Starting bulk analysis for batch ${batchId} with ${resumeFiles.length} files`);

    try {
      const results = [];
      const totalFiles = resumeFiles.length;
      let processedFiles = 0;

      for (const file of resumeFiles) {
        try {
          // Update progress
          const progress = Math.floor((processedFiles / totalFiles) * 100);
          await job.progress(progress);

          // Parse file content
          const parsedContent = await this.parseFileContent(file.content, file.fileName);
          const cleanedText = this.fileParserService.cleanText(parsedContent.text);
          const extractedMetadata = this.fileParserService.extractMetadata(cleanedText);

          // Create resume record
          const resume = this.resumeRepository.create({
            userId,
            fileName: file.fileName,
            fileSize: file.content.length,
            fileType: this.getFileType(file.fileName),
            content: cleanedText,
            parsedContent: {
              ...parsedContent.metadata,
              extractedInfo: extractedMetadata,
              batchId,
            },
            isProcessed: false,
          });

          const savedResume = await this.resumeRepository.save(resume);

          // Create version record
          const version = this.resumeVersionRepository.create({
            resumeId: savedResume.id,
            fileName: file.fileName,
            fileSize: file.content.length,
            fileType: this.getFileType(file.fileName),
            content: cleanedText,
            parsedContent: savedResume.parsedContent,
            versionNumber: 1,
          });

          await this.resumeVersionRepository.save(version);

          // Perform AI analysis
          const analysisResult = await this.aiProviderService.analyzeResume({
            content: cleanedText,
            fileName: file.fileName,
            provider,
          });

          // Calculate metrics
          const atsScore = this.calculateATSScore(analysisResult);
          const suggestions = this.extractSuggestions(analysisResult);

          // Update resume with analysis results
          await this.resumeRepository.update(savedResume.id, {
            atsScore,
            suggestions: suggestions.slice(0, 5) as any, // Limit suggestions for bulk processing
            isProcessed: true,
            parsedContent: {
              ...savedResume.parsedContent,
              analysisResults: {
                ...analysisResult,
                processedAt: new Date().toISOString(),
                provider,
                isBulkProcessed: true,
              },
            },
          });

          results.push({
            fileName: file.fileName,
            resumeId: savedResume.id,
            atsScore,
            status: 'completed',
          });

          processedFiles++;

        } catch (error: any) {
          this.logger.error(`Failed to process file ${file.fileName} in batch ${batchId}`, error);
          
          results.push({
            fileName: file.fileName,
            error: error?.message || 'Processing failed',
            status: 'failed',
          });
          
          processedFiles++;
        }
      }

      await job.progress(100);

      this.logger.log(`Bulk analysis completed for batch ${batchId}. Processed: ${processedFiles}/${totalFiles}`);

      return {
        batchId,
        totalFiles,
        processedFiles,
        successfulFiles: results.filter(r => r.status === 'completed').length,
        failedFiles: results.filter(r => r.status === 'failed').length,
        results,
      };

    } catch (error: any) {
      this.logger.error(`Bulk analysis failed for batch ${batchId}`, error);
      throw error;
    }
  }

  private async parseFileContent(content: Buffer, fileName: string) {
    const fileType = this.getFileType(fileName);
    
    // Create a temporary file-like object for the parser
    const tempFilePath = `/tmp/${fileName}`;
    
    try {
      return await this.fileParserService.parseFile(tempFilePath, fileType, content);
    } catch (error) {
      // Fallback to simple text extraction
      return {
        text: content.toString('utf-8'),
        metadata: { fileName, fileSize: content.length },
      };
    }
  }

  private getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc':
        return 'application/msword';
      case 'txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  }

  private calculateATSScore(analysisResult: any): number {
    try {
      // Simplified ATS scoring for bulk processing
      const content = analysisResult.text?.toLowerCase() || '';
      let score = 40; // Lower base score for bulk processing

      // Quick checks for essential elements
      if (content.includes('contact') || content.includes('@')) score += 15;
      if (content.includes('experience') || content.includes('work')) score += 20;
      if (content.includes('education')) score += 10;
      if (content.includes('skills')) score += 15;

      return Math.min(score, 100);
    } catch (error) {
      return 50; // Default score for bulk processing
    }
  }

  private extractSuggestions(_analysisResult: any): Array<{
    type: 'content' | 'formatting' | 'keywords' | 'structure';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
  }> {
    // Simplified suggestions for bulk processing
    return [
      {
        type: 'content' as const,
        priority: 'high' as const,
        title: 'Review Content',
        description: 'Review and optimize your resume content for better ATS compatibility',
      },
      {
        type: 'keywords' as const,
        priority: 'medium' as const,
        title: 'Add Keywords',
        description: 'Include relevant industry keywords to improve matching',
      },
    ];
  }
}