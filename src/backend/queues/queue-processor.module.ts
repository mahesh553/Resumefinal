import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { Resume } from '../database/entities/resume.entity';
import { ResumeVersion } from '../database/entities/resume-version.entity';
import { JdMatching } from '../database/entities/jd-matching.entity';

// Services
import { FileParserService } from '../modules/resume-analysis/services/file-parser.service';
import { AIProviderService } from '../modules/ai/services/ai-provider.service';

// Processors
import { ResumeAnalysisProcessor } from './processors/resume-analysis.processor';
import { BulkAnalysisProcessor } from './processors/bulk-analysis.processor';
import { JDMatchingProcessor } from './processors/jd-matching.processor';

// Queue types
import { QUEUE_NAMES } from './queue.types';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resume, ResumeVersion, JdMatching]),
    
    // Register all BullMQ queues
    BullModule.registerQueueAsync(
      {
        name: QUEUE_NAMES.RESUME_ANALYSIS,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: configService.get('REDIS_PORT') || 6379,
            password: configService.get('REDIS_PASSWORD'),
          },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.BULK_ANALYSIS,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: configService.get('REDIS_PORT') || 6379,
            password: configService.get('REDIS_PASSWORD'),
          },
          defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 25,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.JD_MATCHING,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: configService.get('REDIS_PORT') || 6379,
            password: configService.get('REDIS_PASSWORD'),
          },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.SUGGESTION_GENERATION,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: configService.get('REDIS_PORT') || 6379,
            password: configService.get('REDIS_PASSWORD'),
          },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.EMAIL_NOTIFICATIONS,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: configService.get('REDIS_PORT') || 6379,
            password: configService.get('REDIS_PASSWORD'),
          },
          defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 25,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.SYSTEM_HEALTH,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: configService.get('REDIS_PORT') || 6379,
            password: configService.get('REDIS_PASSWORD'),
          },
          defaultJobOptions: {
            removeOnComplete: 10,
            removeOnFail: 10,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.DATA_RETENTION,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: configService.get('REDIS_PORT') || 6379,
            password: configService.get('REDIS_PASSWORD'),
          },
          defaultJobOptions: {
            removeOnComplete: 5,
            removeOnFail: 5,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.BILLING,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: configService.get('REDIS_PORT') || 6379,
            password: configService.get('REDIS_PASSWORD'),
          },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        }),
        inject: [ConfigService],
      }
    ),
  ],
  providers: [
    // Processors
    ResumeAnalysisProcessor,
    BulkAnalysisProcessor,
    JDMatchingProcessor,
    
    // Services (imported from other modules)
    FileParserService,
    AIProviderService,
  ],
  exports: [
    // Export BullModule so other modules can inject queues
    BullModule,
  ],
})
export class QueueProcessorModule {}