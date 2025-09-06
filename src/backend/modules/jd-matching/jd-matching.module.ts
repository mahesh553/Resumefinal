import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JdMatching } from '../../database/entities/jd-matching.entity';
import { Resume } from '../../database/entities/resume.entity';
import { QueueModule } from '../../queues/queue.module';
import { JdMatchingController } from './jd-matching.controller';
import { JdMatchingService } from './jd-matching.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([JdMatching, Resume]),
    QueueModule,
  ],
  controllers: [JdMatchingController],
  providers: [JdMatchingService],
  exports: [JdMatchingService],
})
export class JdMatchingModule {}