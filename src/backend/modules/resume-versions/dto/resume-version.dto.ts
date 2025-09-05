import {
  IsString,
  IsOptional,
  MaxLength,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateResumeVersionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateResumeVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ResumeVersionFilterDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class CompareVersionsDto {
  @IsString()
  @IsNotEmpty()
  version1Id: string;

  @IsString()
  @IsNotEmpty()
  version2Id: string;
}

export class ResumeVersionResponseDto {
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
  createdAt: Date;
}