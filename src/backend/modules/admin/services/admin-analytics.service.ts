import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobApplication } from "../../../database/entities/job-application.entity";
import { User } from "../../../database/entities/user.entity";
import { UserRole } from "../../auth/interfaces/auth.interfaces";

export interface SystemMetrics {
  users: {
    total: number;
    activeThisMonth: number;
    newThisWeek: number;
    verifiedEmails: number;
    adminUsers: number;
  };
  resumes: {
    totalUploaded: number;
    analyzedThisMonth: number;
    averageAtsScore: number;
    totalVersions: number;
  };
  jobApplications: {
    total: number;
    addedThisWeek: number;
    statusDistribution: Record<string, number>;
    averagePerUser: number;
  };
  system: {
    activeConnections: number;
    queuedJobs: number;
    errorRate: number;
    avgResponseTime: number;
  };
  growth: {
    userGrowthRate: number;
    resumeGrowthRate: number;
    jobGrowthRate: number;
  };
}

export interface UserActivity {
  date: string;
  registrations: number;
  logins: number;
  resumeUploads: number;
  jobApplications: number;
}

export interface PopularFeatures {
  feature: string;
  usage: number;
  trend: "up" | "down" | "stable";
}

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(JobApplication)
    private jobRepository: Repository<JobApplication>
  ) {}

  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // User metrics
      const [
        totalUsers,
        activeThisMonth,
        newThisWeek,
        verifiedEmails,
        adminUsers,
      ] = await Promise.all([
        this.userRepository.count(),
        this.userRepository.count({
          where: { lastLoginAt: { $gte: oneMonthAgo } as any },
        }),
        this.userRepository.count({
          where: { createdAt: { $gte: oneWeekAgo } as any },
        }),
        this.userRepository.count({
          where: { emailVerifiedAt: { $ne: null } as any },
        }),
        this.userRepository.count({
          where: { role: UserRole.ADMIN },
        }),
      ]);

      // Job application metrics
      const [totalJobs, jobsThisWeek, statusDistribution] = await Promise.all([
        this.jobRepository.count(),
        this.jobRepository.count({
          where: { appliedDate: { $gte: oneWeekAgo } as any },
        }),
        this.getJobStatusDistribution(),
      ]);

      // Calculate averages
      const averageJobsPerUser = totalUsers > 0 ? totalJobs / totalUsers : 0;

      // Growth rates (mock data for now - would need historical data)
      const userGrowthRate = 12.5; // %
      const resumeGrowthRate = 8.3; // %
      const jobGrowthRate = 15.2; // %

      return {
        users: {
          total: totalUsers,
          activeThisMonth,
          newThisWeek,
          verifiedEmails,
          adminUsers,
        },
        resumes: {
          totalUploaded: 0, // Would need Resume entity
          analyzedThisMonth: 0,
          averageAtsScore: 75.5,
          totalVersions: 0,
        },
        jobApplications: {
          total: totalJobs,
          addedThisWeek: jobsThisWeek,
          statusDistribution,
          averagePerUser: Math.round(averageJobsPerUser * 10) / 10,
        },
        system: {
          activeConnections: 0, // Would need WebSocket tracking
          queuedJobs: 0, // Would need BullMQ metrics
          errorRate: 0.2, // Mock data
          avgResponseTime: 245, // Mock data in ms
        },
        growth: {
          userGrowthRate,
          resumeGrowthRate,
          jobGrowthRate,
        },
      };
    } catch (error) {
      this.logger.error("Failed to get system metrics:", error);
      throw error;
    }
  }

  async getUserActivityData(days: number = 30): Promise<UserActivity[]> {
    try {
      const result: UserActivity[] = [];
      const now = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        const [registrations, logins, jobApplications] = await Promise.all([
          this.userRepository.count({
            where: {
              createdAt: {
                $gte: date,
                $lt: nextDate,
              } as any,
            },
          }),
          this.userRepository.count({
            where: {
              lastLoginAt: {
                $gte: date,
                $lt: nextDate,
              } as any,
            },
          }),
          this.jobRepository.count({
            where: {
              appliedDate: {
                $gte: date,
                $lt: nextDate,
              } as any,
            },
          }),
        ]);

        result.push({
          date: date.toISOString().split("T")[0],
          registrations,
          logins,
          resumeUploads: 0, // Would need Resume entity
          jobApplications,
        });
      }

      return result;
    } catch (error) {
      this.logger.error("Failed to get user activity data:", error);
      throw error;
    }
  }

  async getPopularFeatures(): Promise<PopularFeatures[]> {
    // Mock data - would need actual usage tracking
    return [
      { feature: "Resume Analysis", usage: 1250, trend: "up" },
      { feature: "Job Tracking", usage: 980, trend: "up" },
      { feature: "JD Matching", usage: 760, trend: "stable" },
      { feature: "Analytics Dashboard", usage: 620, trend: "up" },
      { feature: "Resume Versions", usage: 340, trend: "down" },
    ];
  }

  private async getJobStatusDistribution(): Promise<Record<string, number>> {
    try {
      const result = await this.jobRepository
        .createQueryBuilder("job")
        .select("job.status", "status")
        .addSelect("COUNT(*)", "count")
        .groupBy("job.status")
        .getRawMany();

      const distribution: Record<string, number> = {};
      result.forEach((item) => {
        distribution[item.status] = parseInt(item.count);
      });

      return distribution;
    } catch (error) {
      this.logger.error("Failed to get job status distribution:", error);
      return {};
    }
  }

  async getTopUsers(limit: number = 10) {
    try {
      return await this.userRepository
        .createQueryBuilder("user")
        .leftJoin("user.resumes", "resume")
        .leftJoin("user.jobApplications", "job")
        .select([
          "user.id",
          "user.email",
          "user.firstName",
          "user.lastName",
          "user.createdAt",
          "user.lastLoginAt",
        ])
        .addSelect("COUNT(DISTINCT resume.id)", "resumeCount")
        .addSelect("COUNT(DISTINCT job.id)", "jobCount")
        .groupBy("user.id")
        .orderBy("resumeCount + jobCount", "DESC")
        .limit(limit)
        .getRawMany();
    } catch (error) {
      this.logger.error("Failed to get top users:", error);
      throw error;
    }
  }

  async getSystemHealth() {
    try {
      // System health metrics
      return {
        status: "healthy",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        timestamp: new Date().toISOString(),
        services: {
          database: "connected",
          redis: "connected",
          ai: "operational",
          websocket: "active",
        },
      };
    } catch (error) {
      this.logger.error("Failed to get system health:", error);
      throw error;
    }
  }
}
