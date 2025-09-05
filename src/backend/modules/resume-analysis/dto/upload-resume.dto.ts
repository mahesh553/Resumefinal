import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadResumeDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Resume file (PDF, DOCX, or TXT)' })
  file: any;

  @ApiProperty({ example: 'Software Engineer Resume v2', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'latest', required: false })
  @IsOptional()
  @IsString()
  tag?: string;
}