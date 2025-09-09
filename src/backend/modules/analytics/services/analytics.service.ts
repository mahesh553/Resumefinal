import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  JobApplication,
  JobStatus,
} from "../../../database/entities/job-application.entity";
import { Resume } from "../../../database/entities/resume.entity";
import { User } from "../../../database/entities/user.entity";

export interface UserStats {
  totalResumes: number;
  averageScore: number;
  totalJobs: number;
  interviewCalls: number;
  recentActivity: RecentActivity[];
}

export interface RecentActivity {
  id: string;
  type:
    | "resume_created"
    | "resume_analyzed"
    | "job_applied"
    | "interview_scheduled";
  title: string;
  description: string;
  date: Date;
  metadata?: any;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
    @InjectRepository(JobApplication)
    private jobApplicationRepository: Repository<JobApplication>
  ) {}

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      // Get total resumes count
      const totalResumes = await this.resumeRepository.count({
        where: { userId },
      });

      // Calculate average score from resumes
      const resumesWithScores = await this.resumeRepository.find({
        where: { userId },
        select: ["atsScore"],
      });

      const averageScore =
        resumesWithScores.length > 0
          ? resumesWithScores
              .filter((r) => r.atsScore !== null && r.atsScore !== undefined)
              .reduce(
                (sum, resume) => sum + (Number(resume.atsScore) || 0),
                0
              ) /
            resumesWithScores.filter(
              (r) => r.atsScore !== null && r.atsScore !== undefined
            ).length
          : 0;

      // Get total job applications count
      const totalJobs = await this.jobApplicationRepository.count({
        where: { userId },
      });

      // Get interview calls count (interviews scheduled or completed)
      const interviewCalls = await this.jobApplicationRepository.count({
        where: {
          userId,
          status: JobStatus.INTERVIEW_SCHEDULED,
        },
      });

      // Get recent activity
      const recentActivity = await this.getRecentActivity(userId);

      return {
        totalResumes,
        averageScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal
        totalJobs,
        interviewCalls,
        recentActivity,
      };
    } catch (error) {
      console.error("Error fetching user stats:", error);
      // Return default stats in case of error
      return {
        totalResumes: 0,
        averageScore: 0,
        totalJobs: 0,
        interviewCalls: 0,
        recentActivity: [],
      };
    }
  }

  private async getRecentActivity(
    userId: string,
    limit: number = 10
  ): Promise<RecentActivity[]> {
    const activities: RecentActivity[] = [];

    try {
      // Get recent resumes (last 30 days)
      const recentResumes = await this.resumeRepository
        .createQueryBuilder("resume")
        .where("resume.userId = :userId", { userId })
        .andWhere("resume.uploadedAt >= :thirtyDaysAgo", {
          thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        })
        .orderBy("resume.uploadedAt", "DESC")
        .limit(5)
        .getMany();

      // Add resume activities
      for (const resume of recentResumes) {
        activities.push({
          id: resume.id,
          type: "resume_created",
          title: "Resume Created",
          description: `Created resume: ${resume.fileName || "Untitled"}`,
          date: resume.uploadedAt,
          metadata: { resumeId: resume.id, fileName: resume.fileName },
        });

        // If resume has been analyzed, add analysis activity
        if (resume.atsScore !== null && resume.atsScore !== undefined) {
          activities.push({
            id: `${resume.id}-analysis`,
            type: "resume_analyzed",
            title: "Resume Analyzed",
            description: `Resume analysis completed with score: ${resume.atsScore}`,
            date: resume.updatedAt || resume.uploadedAt,
            metadata: { resumeId: resume.id, score: resume.atsScore },
          });
        }
      }

      // Get recent job applications (last 30 days)
      const recentJobs = await this.jobApplicationRepository
        .createQueryBuilder("job")
        .where("job.userId = :userId", { userId })
        .andWhere("job.appliedDate >= :thirtyDaysAgo", {
          thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        })
        .orderBy("job.appliedDate", "DESC")
        .limit(5)
        .getMany();

      // Add job application activities
      for (const job of recentJobs) {
        activities.push({
          id: job.id,
          type: "job_applied",
          title: "Job Application",
          description: `Applied to ${job.jobTitle} at ${job.vendorName}`,
          date: job.appliedDate,
          metadata: {
            jobId: job.id,
            company: job.vendorName,
            position: job.jobTitle,
          },
        });

        // Add interview activities if scheduled
        if (job.status === JobStatus.INTERVIEW_SCHEDULED && job.interviewDate) {
          activities.push({
            id: `${job.id}-interview`,
            type: "interview_scheduled",
            title: "Interview Scheduled",
            description: `Interview scheduled for ${job.jobTitle} at ${job.vendorName}`,
            date: job.interviewDate,
            metadata: {
              jobId: job.id,
              company: job.vendorName,
              position: job.jobTitle,
            },
          });
        }
      }

      // Sort by date (most recent first) and limit
      return activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      return [];
    }
  }
}
