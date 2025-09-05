import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Resume } from '../../database/entities/resume.entity';
import { ResumeVersion } from '../../database/entities/resume-version.entity';
import { User } from '../../database/entities/user.entity';
import { ResumeAnalysisController } from './resume-analysis.controller';
import { ResumeAnalysisService } from './resume-analysis.service';
import { FileValidationService } from './services/file-validation.service';
import { FileParserService } from './services/file-parser.service';
import { QueueService } from '../../queues/queue.service';
import * as multer from 'multer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resume, ResumeVersion, User]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        dest: configService.get('UPLOAD_DIRECTORY') || './uploads/temp',
        limits: {
          fileSize: configService.get('MAX_FILE_SIZE') || 10 * 1024 * 1024, // 10MB
        },
        storage: multer.memoryStorage(), // Use memory storage for validation
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ResumeAnalysisController],
  providers: [
    ResumeAnalysisService,
    FileValidationService,
    FileParserService,
    QueueService,
  ],
  exports: [ResumeAnalysisService, FileValidationService],
})
export class ResumeAnalysisModule {}