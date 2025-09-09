import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JobApplication } from "../../database/entities/job-application.entity";
import { Resume } from "../../database/entities/resume.entity";
import { User } from "../../database/entities/user.entity";
import { AnalyticsController } from "./controllers/analytics.controller";
import { AnalyticsService } from "./services/analytics.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, Resume, JobApplication])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
