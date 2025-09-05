import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import {
  QUEUE_NAMES,
  ResumeAnalysisJob,
  BulkResumeAnalysisJob,
  JDMatchingJob,
  SuggestionGenerationJob,
  EmailNotificationJob,
  ProviderHealthCheckJob,
  DataRetentionJob,
  BillingJob,
} from './queue.types';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.RESUME_ANALYSIS)
    private resumeAnalysisQueue: Queue<ResumeAnalysisJob>,
    
    @InjectQueue(QUEUE_NAMES.BULK_ANALYSIS)
    private bulkAnalysisQueue: Queue<BulkResumeAnalysisJob>,
    
    @InjectQueue(QUEUE_NAMES.JD_MATCHING)
    private jdMatchingQueue: Queue<JDMatchingJob>,
    
    @InjectQueue(QUEUE_NAMES.SUGGESTION_GENERATION)
    private suggestionQueue: Queue<SuggestionGenerationJob>,
    
    @InjectQueue(QUEUE_NAMES.EMAIL_NOTIFICATIONS)
    private emailQueue: Queue<EmailNotificationJob>,
    
    @InjectQueue(QUEUE_NAMES.SYSTEM_HEALTH)
    private healthQueue: Queue<ProviderHealthCheckJob>,
    
    @InjectQueue(QUEUE_NAMES.DATA_RETENTION)
    private retentionQueue: Queue<DataRetentionJob>,
    
    @InjectQueue(QUEUE_NAMES.BILLING)
    private billingQueue: Queue<BillingJob>,
  ) {}

  // Resume Analysis
  async addResumeAnalysisJob(data: ResumeAnalysisJob, priority = 0) {
    return this.resumeAnalysisQueue.add('analyze-resume', data, {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  // Bulk Analysis
  async addBulkAnalysisJob(data: BulkResumeAnalysisJob, priority = 0) {
    return this.bulkAnalysisQueue.add('bulk-analyze', data, {
      priority,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  // JD Matching
  async addJDMatchingJob(data: JDMatchingJob, priority = 0) {
    return this.jdMatchingQueue.add('match-jd', data, {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  // Suggestion Generation
  async addSuggestionJob(data: SuggestionGenerationJob, priority = 0) {
    return this.suggestionQueue.add('generate-suggestions', data, {
      priority,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
    });
  }

  // Email Notifications
  async addEmailJob(data: EmailNotificationJob, delay = 0) {
    return this.emailQueue.add('send-email', data, {
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  // System Health Checks
  async addHealthCheckJob(data: ProviderHealthCheckJob) {
    return this.healthQueue.add('health-check', data, {
      repeat: { cron: '*/30 * * * * *' }, // Every 30 seconds
      attempts: 1,
    });
  }

  // Data Retention
  async addRetentionJob(data: DataRetentionJob) {
    return this.retentionQueue.add('cleanup-data', data, {
      repeat: { cron: '0 2 * * *' }, // Daily at 2 AM
      attempts: 1,
    });
  }

  // Billing
  async addBillingJob(data: BillingJob, delay = 0) {
    return this.billingQueue.add('process-billing', data, {
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  // Queue status methods
  async getQueueStats(queueName: string) {
    const queue = this.getQueueByName(queueName);
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  private getQueueByName(queueName: string): Queue {
    switch (queueName) {
      case QUEUE_NAMES.RESUME_ANALYSIS:
        return this.resumeAnalysisQueue;
      case QUEUE_NAMES.BULK_ANALYSIS:
        return this.bulkAnalysisQueue;
      case QUEUE_NAMES.JD_MATCHING:
        return this.jdMatchingQueue;
      case QUEUE_NAMES.SUGGESTION_GENERATION:
        return this.suggestionQueue;
      case QUEUE_NAMES.EMAIL_NOTIFICATIONS:
        return this.emailQueue;
      case QUEUE_NAMES.SYSTEM_HEALTH:
        return this.healthQueue;
      case QUEUE_NAMES.DATA_RETENTION:
        return this.retentionQueue;
      case QUEUE_NAMES.BILLING:
        return this.billingQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
}