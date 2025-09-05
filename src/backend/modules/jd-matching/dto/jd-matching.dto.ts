import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateJDMatchingDto {
  @IsUUID()
  @IsNotEmpty()
  resumeId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  jobDescription: string;

  @IsOptional()
  @IsBoolean()
  useSemanticMatching?: boolean = true;
}

export class JDMatchingResultDto {
  @IsString()
  id: string;

  @IsString()
  userId: string;

  @IsString()
  resumeContent: string;

  @IsString()
  jobDescription: string;

  @IsString()
  overallScore: number;

  keywordMatching?: {
    score: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    totalJobKeywords: number;
    matchingMethod: string;
  };

  semanticMatching?: {
    score: number;
    analysis: string;
    matchingMethod: string;
  };

  suggestions: Array<{
    type: 'content' | 'formatting' | 'keywords' | 'structure';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    keywords?: string[];
  }>;

  matchedKeywords: string[];
  missingKeywords: string[];
  error?: string;
  createdAt: Date;
}