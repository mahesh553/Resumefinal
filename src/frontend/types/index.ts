export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'free' | 'pro' | 'admin';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
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
  status: 'pending' | 'processing' | 'completed' | 'error';
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
  company: string;
  description: string;
  requirements: string[];
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
  applicationDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIAnalysis {
  id: string;
  resumeId: string;
  type: 'resume_analysis' | 'job_match' | 'optimization';
  score: number;
  suggestions: Suggestion[];
  strengths: string[];
  weaknesses: string[];
  keywords: string[];
  createdAt: string;
}

export interface Suggestion {
  id: string;
  type: 'content' | 'formatting' | 'keywords' | 'structure';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  example?: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}