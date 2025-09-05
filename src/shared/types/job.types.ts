export interface JobApplication {
  id: string;
  userId: string;
  vendorName: string;
  jobTitle: string;
  jobDescription?: string;
  applicationUrl?: string;
  status: JobStatus;
  appliedDate: Date;
  followUpDate?: Date;
  interviewDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum JobStatus {
  APPLIED = 'applied',
  UNDER_REVIEW = 'under_review',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  OFFER_RECEIVED = 'offer_received',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export interface JDMatchingResult {
  id: string;
  resumeId: string;
  jobDescription: string;
  overallScore: number;
  skillMatches: SkillMatch[];
  missingSkills: string[];
  suggestions: string[];
  semanticScore?: number;
  createdAt: Date;
}

export interface SkillMatch {
  skill: string;
  resumeStrength: number;
  jdRequirement: number;
  match: boolean;
}

export interface AnalysisResult {
  id: string;
  fileName: string;
  success: boolean;
  atsScore?: number;
  error?: string;
}

export interface BulkAnalysisJob {
  batchId: string;
  userId: string;
  totalFiles: number;
  processedFiles: number;
  status: BulkJobStatus;
  results: AnalysisResult[];
  createdAt: Date;
  completedAt?: Date;
}

export enum BulkJobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}