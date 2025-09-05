import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication } from '../../database/entities/job-application.entity';
import { User } from '../../database/entities/user.entity';
import { JobTrackerController } from './job-tracker.controller';
import { JobTrackerService } from './job-tracker.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobApplication, User]),
  ],
  controllers: [JobTrackerController],
  providers: [JobTrackerService],
  exports: [JobTrackerService],
})
export class JobTrackerModule {}