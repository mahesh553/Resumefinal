import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeVersion } from '../../database/entities/resume-version.entity';
import { Resume } from '../../database/entities/resume.entity';
import {
  CreateResumeVersionDto,
  UpdateResumeVersionDto,
  ResumeVersionFilterDto,
  ResumeVersionResponseDto,
} from './dto/resume-version.dto';

@Injectable()
export class ResumeVersionsService {
  constructor(
    @InjectRepository(ResumeVersion)
    private resumeVersionRepository: Repository<ResumeVersion>,
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
  ) {}

  async createVersion(
    userId: string,
    resumeId: string,
    createDto: CreateResumeVersionDto,
  ): Promise<ResumeVersionResponseDto> {
    // Verify resume exists and belongs to user
    const resume = await this.resumeRepository.findOne({
      where: { id: resumeId, userId },
      relations: ['versions'],
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Enforce 10-version retention policy as per memory specification
    if (resume.versions && resume.versions.length >= 10) {
      // Remove oldest version
      const oldestVersion = await this.resumeVersionRepository.findOne({
        where: { resumeId },
        order: { versionNumber: 'ASC' },
      });

      if (oldestVersion) {
        await this.resumeVersionRepository.remove(oldestVersion);
      }
    }

    // Get next version number
    const maxVersion = await this.resumeVersionRepository
      .createQueryBuilder('version')
      .select('MAX(version.versionNumber)', 'maxVersion')
      .where('version.resumeId = :resumeId', { resumeId })
      .getRawOne();

    const nextVersionNumber = (maxVersion.maxVersion || 0) + 1;

    // Create new version
    const version = this.resumeVersionRepository.create({
      resumeId,
      fileName: createDto.fileName,
      fileSize: Buffer.byteLength(createDto.content, 'utf8'),
      fileType: this.getFileTypeFromName(createDto.fileName),
      content: createDto.content,
      tag: createDto.tag,
      notes: createDto.notes,
      versionNumber: nextVersionNumber,
    });

    const savedVersion = await this.resumeVersionRepository.save(version);

    return this.mapToResponseDto(savedVersion);
  }

  async getVersions(
    userId: string,
    resumeId: string,
    filterDto: ResumeVersionFilterDto,
  ) {
    // Verify resume belongs to user
    await this.verifyResumeAccess(userId, resumeId);

    const { page = 1, limit = 10, tag, sortBy = 'createdAt', sortOrder = 'DESC' } = filterDto;

    const queryBuilder = this.resumeVersionRepository
      .createQueryBuilder('version')
      .where('version.resumeId = :resumeId', { resumeId });

    // Apply filters
    if (tag) {
      queryBuilder.andWhere('version.tag ILIKE :tag', { tag: `%${tag}%` });
    }

    // Apply sorting
    const validSortFields = ['createdAt', 'versionNumber', 'fileName', 'atsScore'];
    if (validSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`version.${sortBy}`, sortOrder);
    } else {
      queryBuilder.orderBy('version.createdAt', 'DESC');
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [versions, total] = await queryBuilder.getManyAndCount();

    return {
      data: versions.map(version => this.mapToResponseDto(version)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getVersion(
    userId: string,
    resumeId: string,
    versionId: string,
  ): Promise<ResumeVersionResponseDto> {
    await this.verifyResumeAccess(userId, resumeId);

    const version = await this.resumeVersionRepository.findOne({
      where: { id: versionId, resumeId },
    });

    if (!version) {
      throw new NotFoundException('Resume version not found');
    }

    return this.mapToResponseDto(version);
  }

  async updateVersion(
    userId: string,
    resumeId: string,
    versionId: string,
    updateDto: UpdateResumeVersionDto,
  ): Promise<ResumeVersionResponseDto> {
    await this.verifyResumeAccess(userId, resumeId);

    const version = await this.resumeVersionRepository.findOne({
      where: { id: versionId, resumeId },
    });

    if (!version) {
      throw new NotFoundException('Resume version not found');
    }

    // Update fields
    Object.assign(version, updateDto);

    const updatedVersion = await this.resumeVersionRepository.save(version);
    return this.mapToResponseDto(updatedVersion);
  }

  async deleteVersion(
    userId: string,
    resumeId: string,
    versionId: string,
  ): Promise<void> {
    await this.verifyResumeAccess(userId, resumeId);

    // Check if this is the only version
    const versionCount = await this.resumeVersionRepository.count({
      where: { resumeId },
    });

    if (versionCount <= 1) {
      throw new BadRequestException('Cannot delete the last remaining version');
    }

    const version = await this.resumeVersionRepository.findOne({
      where: { id: versionId, resumeId },
    });

    if (!version) {
      throw new NotFoundException('Resume version not found');
    }

    await this.resumeVersionRepository.remove(version);
  }

  async compareVersions(
    userId: string,
    resumeId: string,
    version1Id: string,
    version2Id: string,
  ) {
    await this.verifyResumeAccess(userId, resumeId);

    const [version1, version2] = await Promise.all([
      this.resumeVersionRepository.findOne({
        where: { id: version1Id, resumeId },
      }),
      this.resumeVersionRepository.findOne({
        where: { id: version2Id, resumeId },
      }),
    ]);

    if (!version1 || !version2) {
      throw new NotFoundException('One or both versions not found');
    }

    // Calculate differences
    const comparison = {
      version1: this.mapToResponseDto(version1),
      version2: this.mapToResponseDto(version2),
      differences: {
        atsScoreDiff: (version2.atsScore || 0) - (version1.atsScore || 0),
        fileSizeDiff: version2.fileSize - version1.fileSize,
        contentLengthDiff: version2.content.length - version1.content.length,
        versionNumberDiff: version2.versionNumber - version1.versionNumber,
      },
      summary: {
        improved: (version2.atsScore || 0) > (version1.atsScore || 0),
        scoreChange: Math.abs((version2.atsScore || 0) - (version1.atsScore || 0)),
        newerVersion: version2.versionNumber > version1.versionNumber ? 'version2' : 'version1',
      },
    };

    return comparison;
  }

  async restoreVersion(
    userId: string,
    resumeId: string,
    versionId: string,
  ): Promise<ResumeVersionResponseDto> {
    await this.verifyResumeAccess(userId, resumeId);

    const version = await this.resumeVersionRepository.findOne({
      where: { id: versionId, resumeId },
    });

    if (!version) {
      throw new NotFoundException('Resume version not found');
    }

    // Create a new version from the selected version
    const restoredVersion = await this.createVersion(userId, resumeId, {
      fileName: version.fileName,
      content: version.content,
      tag: `Restored from v${version.versionNumber}`,
      notes: `Restored from version ${version.versionNumber} on ${new Date().toISOString()}`,
    });

    // Update the main resume with the restored content
    await this.resumeRepository.update(resumeId, {
      content: version.content,
      parsedContent: version.parsedContent,
      atsScore: version.atsScore,
    });

    return restoredVersion;
  }

  async getVersionStats(userId: string, resumeId: string) {
    await this.verifyResumeAccess(userId, resumeId);

    const versions = await this.resumeVersionRepository.find({
      where: { resumeId },
      order: { versionNumber: 'ASC' },
    });

    if (versions.length === 0) {
      return {
        totalVersions: 0,
        averageScore: 0,
        scoreImprovement: 0,
        bestVersion: null,
        recentVersions: [],
      };
    }

    const scores = versions.filter(v => v.atsScore !== null).map(v => v.atsScore!);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const firstScore = versions[0]?.atsScore || 0;
    const lastScore = versions[versions.length - 1]?.atsScore || 0;
    const scoreImprovement = lastScore - firstScore;

    const bestVersion = scores.length > 0 ? 
      versions.find(v => v.atsScore === Math.max(...scores)) : null;

    return {
      totalVersions: versions.length,
      averageScore: Math.round(averageScore * 100) / 100,
      scoreImprovement: Math.round(scoreImprovement * 100) / 100,
      bestVersion: bestVersion ? this.mapToResponseDto(bestVersion) : null,
      recentVersions: versions.slice(-5).map(v => this.mapToResponseDto(v)),
    };
  }

  async enforceRetentionPolicy(userId: string): Promise<{ deletedVersions: number }> {
    // Get all resumes for the user
    const resumes = await this.resumeRepository.find({
      where: { userId },
      select: ['id'],
    });

    let totalDeleted = 0;

    for (const resume of resumes) {
      const versions = await this.resumeVersionRepository.find({
        where: { resumeId: resume.id },
        order: { versionNumber: 'ASC' },
      });

      // Keep only the latest 10 versions as per memory specification
      if (versions.length > 10) {
        const versionsToDelete = versions.slice(0, versions.length - 10);
        await this.resumeVersionRepository.remove(versionsToDelete);
        totalDeleted += versionsToDelete.length;
      }
    }

    return { deletedVersions: totalDeleted };
  }

  private async verifyResumeAccess(userId: string, resumeId: string): Promise<void> {
    const resume = await this.resumeRepository.findOne({
      where: { id: resumeId, userId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }
  }

  private getFileTypeFromName(fileName: string): string {
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

  private mapToResponseDto(version: ResumeVersion): ResumeVersionResponseDto {
    return {
      id: version.id,
      resumeId: version.resumeId,
      fileName: version.fileName,
      fileSize: version.fileSize,
      fileType: version.fileType,
      content: version.content,
      parsedContent: version.parsedContent,
      atsScore: version.atsScore ? parseFloat(version.atsScore.toString()) : undefined,
      tag: version.tag,
      notes: version.notes,
      versionNumber: version.versionNumber,
      createdAt: version.createdAt,
    };
  }
}