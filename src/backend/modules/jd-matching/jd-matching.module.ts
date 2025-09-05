import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JdMatching } from '../../database/entities/jd-matching.entity';
import { Resume } from '../../database/entities/resume.entity';
import { QueueService } from '../../queues/queue.service';
import { JdMatchingController } from './jd-matching.controller';
import { JdMatchingService } from './jd-matching.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([JdMatching, Resume]),
  ],
  controllers: [JdMatchingController],
  providers: [JdMatchingService, QueueService],
  exports: [JdMatchingService],
})
export class JdMatchingModule {}