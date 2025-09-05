import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeVersion } from '../../database/entities/resume-version.entity';
import { Resume } from '../../database/entities/resume.entity';
import { ResumeVersionsController } from './resume-versions.controller';
import { ResumeVersionsService } from './resume-versions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResumeVersion, Resume]),
  ],
  controllers: [ResumeVersionsController],
  providers: [ResumeVersionsService],
  exports: [ResumeVersionsService],
})
export class ResumeVersionsModule {}