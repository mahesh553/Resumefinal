export interface ParsedResumeContent {
  sections?: Record<string, string>;
  extractedInfo?: {
    contactInfo?: PersonalInfo;
    skills?: string[];
    experience?: WorkExperience[];
    education?: Education[];
  };
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    formatting?: Record<string, unknown>;
  };
}

export interface SemanticAnalysis {
  keywords?: string[];
  phrases?: string[];
  concepts?: string[];
  sentiment?: {
    score: number;
    confidence: number;
  };
  readability?: {
    score: number;
    level: string;
  };
}

export interface AIAnalysisOptions {
  includePersonalInfo?: boolean;
  includeSkillExtraction?: boolean;
  includeSuggestions?: boolean;
  maxSuggestions?: number;
  focusAreas?: string[];
  industry?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  fileName?: string;
  maxTokens?: number;
  mode?: string;
}

export interface AISuggestionOptions {
  maxSuggestions?: number;
  focusAreas?: ('ats' | 'keywords' | 'format' | 'content' | 'achievements')[];
  targetRole?: string;
  industry?: string;
}

export interface AIMatchingOptions {
  includeDetailedAnalysis?: boolean;
  prioritizeSkills?: string[];
  industryWeights?: Record<string, number>;
  minConfidenceThreshold?: number;
}

export interface AIProvider {
  name: string;
  isHealthy: boolean;
  priority: number;
  costPerToken: number;
  analyze(text: string, options?: AIAnalysisOptions): Promise<ResumeAnalysisResult>;
  generateSuggestions(resumeText: string, jobDescription?: string, options?: AISuggestionOptions): Promise<string[]>;
  matchJobDescription(resumeText: string, jobDescription: string, options?: AIMatchingOptions): Promise<JDMatchResult>;
}

export interface ResumeAnalysisResult {
  atsScore: number;
  skills: ExtractedSkill[];
  suggestions: string[];
  personalInfo: PersonalInfo;
  experience: WorkExperience[];
  education: Education[];
  summary?: string;
  confidence: number;
  processingTime: number;
  text?: string;
}

export interface ExtractedSkill {
  name: string;
  category: SkillCategory;
  confidence: number;
  yearsExperience?: number;
  level?: SkillLevel;
}

export interface PersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
}

export interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
  achievements: string[];
  skills: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
  achievements?: string[];
}

export interface JDMatchResult {
  overallScore: number;
  skillMatches: SkillMatch[];
  missingSkills: string[];
  strengthAreas: string[];
  improvementAreas: string[];
  recommendations: string[];
  confidence: number;
}

export interface SkillMatch {
  skill: string;
  resumeStrength: number;
  jdRequirement: number;
  isMatch: boolean;
  gap?: number;
}

export enum SkillCategory {
  TECHNICAL = 'technical',
  SOFT = 'soft',
  LANGUAGE = 'language',
  CERTIFICATION = 'certification',
  TOOL = 'tool',
  FRAMEWORK = 'framework',
}

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export interface AIProviderConfig {
  name: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  priority: number;
  costPerToken: number;
  rateLimitRPM: number;
  rateLimitTPM: number;
}