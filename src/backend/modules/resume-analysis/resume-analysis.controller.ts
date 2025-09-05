import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  BadRequestException,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResumeAnalysisService } from './resume-analysis.service';
import { FileValidationService } from './services/file-validation.service';


@ApiTags('resume-analysis')
@Controller('resume')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResumeAnalysisController {
  constructor(
    private readonly resumeAnalysisService: ResumeAnalysisService,
    private readonly fileValidationService: FileValidationService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
          cb(null, uploadDir);
        },
        filename: (req: any, file, cb) => {
          // Generate secure filename
          const userId = req.user?.sub || 'anonymous';
          const fileValidationService = new (req as any).constructor.fileValidationService || 
            { generateSecureFileName: (name: string, _uid: string) => `${Date.now()}_${name}` };
          const filename = fileValidationService.generateSecureFileName(
            file.originalname,
            userId
          );
          cb(null, filename);
        },
      }),
      fileFilter: (req: any, file, cb) => {
        // We'll validate in the controller method instead
        cb(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload and analyze resume' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Resume uploaded and analysis started' })
  @ApiResponse({ status: 400, description: 'Invalid file or validation failed' })
  async uploadResume(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    // Validate file
    const validation = this.fileValidationService.validateFile(file);
    if (!validation.isValid) {
      throw new BadRequestException(validation.error);
    }

    // Process upload
    return this.resumeAnalysisService.processUpload(file, req.user.sub);
  }

  @Get('analysis/:id')
  @ApiOperation({ summary: 'Get resume analysis results' })
  @ApiResponse({ status: 200, description: 'Analysis results retrieved' })
  @ApiResponse({ status: 404, description: 'Analysis not found' })
  async getAnalysis(@Param('id') analysisId: string, @Request() req: any) {
    return this.resumeAnalysisService.getAnalysis(analysisId, req.user.sub);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get user resumes' })
  @ApiResponse({ status: 200, description: 'Resume list retrieved' })
  async getUserResumes(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.resumeAnalysisService.getUserResumes(req.user.sub, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('files'))
  @ApiOperation({ summary: 'Upload multiple resumes for batch processing' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Bulk upload started' })
  async bulkUpload(@UploadedFile() files: Express.Multer.File[], @Request() req: any) {
    return this.resumeAnalysisService.processBulkUpload(files, req.user.sub);
  }
}