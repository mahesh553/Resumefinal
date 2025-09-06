export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

export enum SubscriptionPlan {
  FREE = "free",
  PRO_MONTHLY = "pro_monthly",
  PRO_3MONTH = "pro_3month",
  PRO_6MONTH = "pro_6month",
}

export enum SubscriptionStatus {
  ACTIVE = "active",
  CANCELED = "canceled",
  PAST_DUE = "past_due",
  UNPAID = "unpaid",
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  subscription?: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    currentPeriodEnd?: string;
  };
}

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  content: string;
  parsedContent?: any;
  atsScore?: number;
  status: "pending" | "processing" | "completed" | "error";
  createdAt: string;
  updatedAt: string;
  versions: ResumeVersion[];
}

export interface ResumeVersion {
  id: string;
  resumeId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  content: string;
  parsedContent?: any;
  atsScore?: number;
  tag?: string;
  notes?: string;
  versionNumber: number;
  createdAt: string;
}

export interface Job {
  id: string;
  userId: string;
  title: string;
  jobTitle: string; // Added for compatibility
  company: string;
  vendorName: string; // Added for compatibility
  description: string;
  requirements: string[];
  location: string;
  salaryRange?: string; // Added
  type: "full-time" | "part-time" | "contract" | "internship";
  status:
    | "applied"
    | "interview_scheduled"
    | "offer_received"
    | "rejected"
    | "withdrawn";
  applicationDate: string;
  appliedDate: string; // Added for compatibility
  followUpDate?: string; // Added
  interviewDate?: string; // Added
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIAnalysis {
  id: string;
  resumeId: string;
  type: "resume_analysis" | "job_match" | "optimization";
  score: number;
  suggestions: Suggestion[];
  strengths: string[];
  weaknesses: string[];
  keywords: string[];
  createdAt: string;
}

export interface Suggestion {
  id: string;
  type: "content" | "formatting" | "keywords" | "structure";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  example?: string;
  impact?: string;
  estimatedImprovement?: string;
}

export interface AnalysisData {
  id: string;
  fileName: string;
  uploadedAt: string;
  atsScore: number;
  overallScore?: number;
  previousScore?: number;
  isProcessing?: boolean;
  isProcessed?: boolean;
  suggestions: Suggestion[];
  parsedContent?: {
    keywords?: {
      found: string[];
      missing: string[];
      suggestions: string[];
    };
    skills?: string[];
    scores?: {
      content: number;
      formatting: number;
      keywords: number;
      structure: number;
    };
    strengths?: string[];
  };
  scores?: {
    content: number;
    formatting: number;
    keywords: number;
    structure: number;
  };
  strengths?: string[];
  competitorAnalysis?: {
    averageScore: number;
    topPercentile: number;
    yourRanking: string;
  };
  trends?: Array<{
    period: string;
    score: number;
  }>;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "processing" | "completed" | "error";
  error?: string;
}
