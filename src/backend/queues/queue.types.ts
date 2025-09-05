export const QUEUE_NAMES = {
  RESUME_ANALYSIS: 'resume-analysis',
  BULK_ANALYSIS: 'bulk-analysis',
  JD_MATCHING: 'jd-matching',
  SUGGESTION_GENERATION: 'suggestion-generation',
  EMAIL_NOTIFICATIONS: 'email-notifications',
  SYSTEM_HEALTH: 'system-health',
  DATA_RETENTION: 'data-retention',
  BILLING: 'billing',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// Job type interfaces
export interface ResumeAnalysisJob {
  resumeId: string;
  userId: string;
  fileContent: Buffer;
  provider: 'gemini' | 'openai' | 'claude';
}

export interface BulkResumeAnalysisJob {
  batchId: string;
  userId: string;
  resumeFiles: { id: string; content: Buffer; fileName: string }[];
  provider: 'gemini' | 'openai' | 'claude';
}

export interface JDMatchingJob {
  analysisId: string;
  resumeContent: string;
  jobDescription: string;
  userId: string;
  useSemanticMatching?: boolean;
}

export interface SuggestionGenerationJob {
  analysisId: string;
  missedSkills: string[];
  context: string;
  userId: string;
  remainingGenerations: number;
}

export interface EmailNotificationJob {
  userId: string;
  template: string;
  data: Record<string, any>;
}

export interface ProviderHealthCheckJob {
  providerId: string;
  endpoint: string;
}

export interface DataRetentionJob {
  policy: 'resume_versions' | 'audit_logs' | 'temporary_files';
  retentionDays: number;
  dryRun: boolean;
}

export interface BillingJob {
  subscriptionId?: string;
  userId?: string;
  type: 'renewal' | 'usage_reset' | 'invoice_generation';
  data: any;
}