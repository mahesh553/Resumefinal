import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { JobApplication, JobStatus } from '../../database/entities/job-application.entity';
import { User } from '../../database/entities/user.entity';
import {
  CreateJobApplicationDto,
  UpdateJobApplicationDto,
  JobApplicationFilterDto,
} from './dto/job-application.dto';

@Injectable()
export class JobTrackerService {
  constructor(
    @InjectRepository(JobApplication)
    private jobApplicationRepository: Repository<JobApplication>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(userId: string, createDto: CreateJobApplicationDto): Promise<JobApplication> {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create new job application
    const jobApplication = this.jobApplicationRepository.create({
      ...createDto,
      userId,
      appliedDate: new Date(createDto.appliedDate),
      followUpDate: createDto.followUpDate ? new Date(createDto.followUpDate) : undefined,
      interviewDate: createDto.interviewDate ? new Date(createDto.interviewDate) : undefined,
    });

    return await this.jobApplicationRepository.save(jobApplication);
  }

  async findAll(userId: string, filterDto: JobApplicationFilterDto) {
    const {
      status,
      vendorName,
      location,
      appliedAfter,
      appliedBefore,
      page = 1,
      limit = 10,
      sortBy = 'appliedDate',
      sortOrder = 'DESC',
    } = filterDto;

    // Build query
    const queryBuilder: SelectQueryBuilder<JobApplication> = this.jobApplicationRepository
      .createQueryBuilder('job')
      .where('job.userId = :userId', { userId });

    // Apply filters
    if (status) {
      queryBuilder.andWhere('job.status = :status', { status });
    }

    if (vendorName) {
      queryBuilder.andWhere('job.vendorName ILIKE :vendorName', { 
        vendorName: `%${vendorName}%` 
      });
    }

    if (location) {
      queryBuilder.andWhere('job.location ILIKE :location', { 
        location: `%${location}%` 
      });
    }

    if (appliedAfter) {
      queryBuilder.andWhere('job.appliedDate >= :appliedAfter', { 
        appliedAfter: new Date(appliedAfter) 
      });
    }

    if (appliedBefore) {
      queryBuilder.andWhere('job.appliedDate <= :appliedBefore', { 
        appliedBefore: new Date(appliedBefore) 
      });
    }

    // Apply sorting
    const validSortFields = [
      'appliedDate', 'vendorName', 'jobTitle', 'status', 'createdAt', 'updatedAt'
    ];
    
    if (validSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`job.${sortBy}`, sortOrder);
    } else {
      queryBuilder.orderBy('job.appliedDate', 'DESC');
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Get results and count
    const [jobApplications, total] = await queryBuilder.getManyAndCount();

    return {
      data: jobApplications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string): Promise<JobApplication> {
    const jobApplication = await this.jobApplicationRepository.findOne({
      where: { id, userId },
    });

    if (!jobApplication) {
      throw new NotFoundException('Job application not found');
    }

    return jobApplication;
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateJobApplicationDto,
  ): Promise<JobApplication> {
    const jobApplication = await this.findOne(userId, id);

    // Update fields
    Object.assign(jobApplication, {
      ...updateDto,
      appliedDate: updateDto.appliedDate ? new Date(updateDto.appliedDate) : jobApplication.appliedDate,
      followUpDate: updateDto.followUpDate ? new Date(updateDto.followUpDate) : jobApplication.followUpDate,
      interviewDate: updateDto.interviewDate ? new Date(updateDto.interviewDate) : jobApplication.interviewDate,
    });

    return await this.jobApplicationRepository.save(jobApplication);
  }

  async remove(userId: string, id: string): Promise<void> {
    const jobApplication = await this.findOne(userId, id);
    await this.jobApplicationRepository.remove(jobApplication);
  }

  async getStatusCounts(userId: string): Promise<Record<JobStatus, number>> {
    const counts = await this.jobApplicationRepository
      .createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('job.userId = :userId', { userId })
      .groupBy('job.status')
      .getRawMany();

    // Initialize all statuses with 0
    const statusCounts: Record<JobStatus, number> = Object.values(JobStatus).reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<JobStatus, number>,
    );

    // Fill in actual counts
    counts.forEach(({ status, count }) => {
      statusCounts[status as JobStatus] = parseInt(count, 10);
    });

    return statusCounts;
  }

  async getRecentActivity(userId: string, days: number = 30): Promise<JobApplication[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await this.jobApplicationRepository.find({
      where: {
        userId,
      },
      order: { updatedAt: 'DESC' },
      take: 10,
    });
  }

  async updateStatus(userId: string, id: string, status: JobStatus): Promise<JobApplication> {
    const jobApplication = await this.findOne(userId, id);
    jobApplication.status = status;
    
    // Auto-set dates based on status
    if (status === JobStatus.INTERVIEW_SCHEDULED && !jobApplication.interviewDate) {
      // Set interview date to tomorrow if not already set
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      jobApplication.interviewDate = tomorrow;
    }

    return await this.jobApplicationRepository.save(jobApplication);
  }

  async bulkUpdateStatus(
    userId: string,
    jobIds: string[],
    status: JobStatus,
  ): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const jobId of jobIds) {
      try {
        await this.updateStatus(userId, jobId, status);
        updated++;
      } catch (error: any) {
        errors.push(`Failed to update job ${jobId}: ${error?.message || 'Unknown error'}`);
      }
    }

    return { updated, errors };
  }

  async getUpcomingFollowUps(userId: string, days: number = 7): Promise<JobApplication[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return await this.jobApplicationRepository.find({
      where: {
        userId,
      },
      order: { followUpDate: 'ASC' },
    });
  }

  async getUpcomingInterviews(userId: string, days: number = 14): Promise<JobApplication[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return await this.jobApplicationRepository.find({
      where: {
        userId,
      },
      order: { interviewDate: 'ASC' },
    });
  }
}