import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JdMatching } from '../../database/entities/jd-matching.entity';
import { Resume } from '../../database/entities/resume.entity';
import { QueueService } from '../../queues/queue.service';
import { CreateJDMatchingDto, JDMatchingResultDto } from './dto/jd-matching.dto';
import * as crypto from 'crypto';

@Injectable()
export class JdMatchingService {
  constructor(
    @InjectRepository(JdMatching)
    private jdMatchingRepository: Repository<JdMatching>,
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
    private queueService: QueueService,
  ) {}

  async createMatching(userId: string, createDto: CreateJDMatchingDto): Promise<{ analysisId: string; message: string }> {
    // Verify resume exists and belongs to user
    const resume = await this.resumeRepository.findOne({
      where: { id: createDto.resumeId, userId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (!resume.isProcessed) {
      throw new BadRequestException('Resume must be processed before matching can be performed');
    }

    // Generate unique analysis ID
    const analysisId = crypto.randomUUID();

    // Queue the JD matching job
    await this.queueService.addJDMatchingJob({
      analysisId,
      resumeContent: resume.content,
      jobDescription: createDto.jobDescription,
      userId,
      useSemanticMatching: createDto.useSemanticMatching,
    });

    return {
      analysisId,
      message: 'JD matching analysis queued for processing',
    };
  }

  async getMatchingResult(userId: string, analysisId: string): Promise<JDMatchingResultDto> {
    const matching = await this.jdMatchingRepository.findOne({
      where: { id: analysisId, userId },
    });

    if (!matching) {
      throw new NotFoundException('JD matching result not found');
    }

    return {
      id: matching.id,
      userId: matching.userId,
      resumeContent: matching.resumeContent,
      jobDescription: matching.jobDescription,
      overallScore: parseFloat(matching.overallScore.toString()),
      keywordMatching: matching.keywordMatching,
      semanticMatching: matching.semanticMatching,
      suggestions: matching.suggestions,
      matchedKeywords: matching.matchedKeywords,
      missingKeywords: matching.missingKeywords,
      error: matching.error,
      createdAt: matching.createdAt,
    };
  }

  async getUserMatchings(userId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [matchings, total] = await this.jdMatchingRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      select: [
        'id',
        'overallScore',
        'createdAt',
        'error'
      ],
    });

    return {
      matchings: matchings.map(matching => ({
        id: matching.id,
        overallScore: parseFloat(matching.overallScore.toString()),
        createdAt: matching.createdAt,
        status: matching.error ? 'error' : 'completed',
        hasError: !!matching.error,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteMatching(userId: string, analysisId: string): Promise<void> {
    const matching = await this.jdMatchingRepository.findOne({
      where: { id: analysisId, userId },
    });

    if (!matching) {
      throw new NotFoundException('JD matching result not found');
    }

    await this.jdMatchingRepository.remove(matching);
  }

  async getMatchingStats(userId: string): Promise<{
    totalMatchings: number;
    averageScore: number;
    highScoreMatchings: number;
    recentMatchings: any[];
  }> {
    // Get total count
    const totalMatchings = await this.jdMatchingRepository.count({
      where: { userId, error: IsNull() },
    });

    if (totalMatchings === 0) {
      return {
        totalMatchings: 0,
        averageScore: 0,
        highScoreMatchings: 0,
        recentMatchings: [],
      };
    }

    // Get average score
    const avgResult = await this.jdMatchingRepository
      .createQueryBuilder('jd')
      .select('AVG(jd.overallScore)', 'average')
      .where('jd.userId = :userId AND jd.error IS NULL', { userId })
      .getRawOne();

    const averageScore = parseFloat(avgResult.average) || 0;

    // Get high score matchings (>= 70)
    const highScoreMatchings = await this.jdMatchingRepository.count({
      where: { userId, error: IsNull() },
    });

    // Get recent matchings
    const recentMatchings = await this.jdMatchingRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 5,
      select: ['id', 'overallScore', 'createdAt', 'error'],
    });

    return {
      totalMatchings,
      averageScore: Math.round(averageScore * 100) / 100,
      highScoreMatchings,
      recentMatchings: recentMatchings.map(matching => ({
        id: matching.id,
        overallScore: parseFloat(matching.overallScore.toString()),
        createdAt: matching.createdAt,
        status: matching.error ? 'error' : 'completed',
      })),
    };
  }

  async compareMatchings(userId: string, analysisIds: string[]): Promise<{
    comparisons: Array<{
      id: string;
      overallScore: number;
      keywordScore?: number;
      semanticScore?: number;
      matchedKeywords: string[];
      missingKeywords: string[];
      createdAt: Date;
    }>;
  }> {
    if (analysisIds.length > 5) {
      throw new BadRequestException('Maximum 5 matchings can be compared at once');
    }

    const matchings = await this.jdMatchingRepository.find({
      where: { userId },
      select: [
        'id',
        'overallScore',
        'keywordMatching',
        'semanticMatching',
        'matchedKeywords',
        'missingKeywords',
        'createdAt',
      ],
    });

    return {
      comparisons: matchings.map(matching => ({
        id: matching.id,
        overallScore: parseFloat(matching.overallScore.toString()),
        keywordScore: matching.keywordMatching?.score,
        semanticScore: matching.semanticMatching?.score,
        matchedKeywords: matching.matchedKeywords,
        missingKeywords: matching.missingKeywords,
        createdAt: matching.createdAt,
      })),
    };
  }

  async getTopKeywords(userId: string, limit: number = 20): Promise<{
    mostMatched: Array<{ keyword: string; frequency: number }>;
    mostMissing: Array<{ keyword: string; frequency: number }>;
  }> {
    const matchings = await this.jdMatchingRepository.find({
      where: { userId, error: IsNull() },
      select: ['matchedKeywords', 'missingKeywords'],
    });

    // Count keyword frequencies
    const matchedCounts: Record<string, number> = {};
    const missingCounts: Record<string, number> = {};

    matchings.forEach(matching => {
      matching.matchedKeywords.forEach(keyword => {
        matchedCounts[keyword] = (matchedCounts[keyword] || 0) + 1;
      });

      matching.missingKeywords.forEach(keyword => {
        missingCounts[keyword] = (missingCounts[keyword] || 0) + 1;
      });
    });

    // Sort and limit
    const mostMatched = Object.entries(matchedCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([keyword, frequency]) => ({ keyword, frequency }));

    const mostMissing = Object.entries(missingCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([keyword, frequency]) => ({ keyword, frequency }));

    return { mostMatched, mostMissing };
  }
}