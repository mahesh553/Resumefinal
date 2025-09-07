import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { UserRole } from "../../../database/entities/user.entity";

export class CreateUserDto {
  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "User first name", example: "John" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ description: "User last name", example: "Doe" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ description: "User password", example: "securePassword123!" })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({
    description: "User role",
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: "User first name" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ description: "User last name" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ description: "User email address" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: "User role",
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: "User active status" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UserSearchDto {
  @ApiPropertyOptional({
    description: "Search term for email, firstName, or lastName",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filter by user role",
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: "Filter by active status" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Filter by email verification status" })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({
    description: "Page number",
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: "Items per page",
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: "Sort field",
    enum: ["createdAt", "lastLoginAt", "email", "firstName"],
    default: "createdAt",
  })
  @IsOptional()
  @IsString()
  sortBy?: "createdAt" | "lastLoginAt" | "email" | "firstName";

  @ApiPropertyOptional({
    description: "Sort order",
    enum: ["ASC", "DESC"],
    default: "DESC",
  })
  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC";
}

export class ResetPasswordDto {
  @ApiProperty({
    description: "New password for the user",
    example: "newSecurePassword123!",
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

export class UserActionDto {
  @ApiProperty({ description: "User ID" })
  @IsUUID()
  userId: string;
}

export class BulkUserActionDto {
  @ApiProperty({
    description: "Array of user IDs",
    type: [String],
  })
  @IsUUID(4, { each: true })
  userIds: string[];

  @ApiProperty({
    description: "Action to perform",
    enum: ["activate", "deactivate", "delete", "verifyEmail"],
  })
  @IsEnum(["activate", "deactivate", "delete", "verifyEmail"])
  action: "activate" | "deactivate" | "delete" | "verifyEmail";
}

export class SystemSettingsDto {
  @ApiPropertyOptional({ description: "Maximum file upload size in bytes" })
  @IsOptional()
  @IsNumber()
  @Min(1024) // 1KB minimum
  maxFileSize?: number;

  @ApiPropertyOptional({ description: "Maximum number of resumes per user" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxResumesPerUser?: number;

  @ApiPropertyOptional({ description: "Enable user registration" })
  @IsOptional()
  @IsBoolean()
  allowRegistration?: boolean;

  @ApiPropertyOptional({ description: "Require email verification" })
  @IsOptional()
  @IsBoolean()
  requireEmailVerification?: boolean;

  @ApiPropertyOptional({ description: "Enable AI analysis" })
  @IsOptional()
  @IsBoolean()
  enableAIAnalysis?: boolean;

  @ApiPropertyOptional({ description: "AI provider preference order" })
  @IsOptional()
  @IsString({ each: true })
  aiProviderOrder?: string[];
}

export class MetricsQueryDto {
  @ApiPropertyOptional({
    description: "Number of days to retrieve data for",
    minimum: 1,
    maximum: 365,
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;

  @ApiPropertyOptional({
    description: "Number of hours to retrieve data for",
    minimum: 1,
    maximum: 168, // 7 days
    default: 24,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  hours?: number;

  @ApiPropertyOptional({
    description: "Limit number of results",
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UserStatsResponseDto {
  @ApiProperty({ description: "User ID" })
  id: string;

  @ApiProperty({ description: "User email" })
  email: string;

  @ApiProperty({ description: "User first name" })
  firstName: string;

  @ApiProperty({ description: "User last name" })
  lastName: string;

  @ApiProperty({ description: "User role", enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: "User active status" })
  isActive: boolean;

  @ApiProperty({ description: "Email verification date" })
  emailVerifiedAt: Date;

  @ApiProperty({ description: "Account creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last login date" })
  lastLoginAt: Date;

  @ApiProperty({ description: "Number of resumes uploaded" })
  resumeCount: number;

  @ApiProperty({ description: "Number of job applications" })
  jobApplicationCount: number;

  @ApiProperty({ description: "Average ATS score" })
  averageAtsScore: number;
}

export class SystemMetricsResponseDto {
  @ApiProperty({
    description: "User metrics",
    type: "object",
    properties: {
      total: { type: "number" },
      activeThisMonth: { type: "number" },
      newThisWeek: { type: "number" },
      verifiedEmails: { type: "number" },
      adminUsers: { type: "number" },
    },
  })
  users: {
    total: number;
    activeThisMonth: number;
    newThisWeek: number;
    verifiedEmails: number;
    adminUsers: number;
  };

  @ApiProperty({
    description: "Resume metrics",
    type: "object",
    additionalProperties: true,
  })
  resumes: {
    totalUploaded: number;
    analyzedThisMonth: number;
    averageAtsScore: number;
    totalVersions: number;
  };

  @ApiProperty({
    description: "Job application metrics",
    type: "object",
    additionalProperties: true,
  })
  jobApplications: {
    total: number;
    addedThisWeek: number;
    statusDistribution: Record<string, number>;
    averagePerUser: number;
  };

  @ApiProperty({
    description: "System performance metrics",
    type: "object",
    additionalProperties: true,
  })
  system: {
    activeConnections: number;
    queuedJobs: number;
    errorRate: number;
    avgResponseTime: number;
  };

  @ApiProperty({
    description: "Growth metrics",
    type: "object",
    additionalProperties: true,
  })
  growth: {
    userGrowthRate: number;
    resumeGrowthRate: number;
    jobGrowthRate: number;
  };
}
