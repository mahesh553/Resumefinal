import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { 
  ApiBearerAuth, 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResumeVersionsService } from './resume-versions.service';
import {
  CreateResumeVersionDto,
  UpdateResumeVersionDto,
  ResumeVersionFilterDto,
} from './dto/resume-version.dto';

@ApiTags('Resume Versions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resumes/:resumeId/versions')
export class ResumeVersionsController {
  constructor(private readonly resumeVersionsService: ResumeVersionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new resume version' })
  @ApiParam({ name: 'resumeId', type: String, description: 'Resume ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Resume version created successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Resume not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  async create(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Param('resumeId', ParseUUIDPipe) resumeId: string,
    @Body() createDto: CreateResumeVersionDto,
  ) {
    return await this.resumeVersionsService.createVersion(req.user.userId, resumeId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all versions of a resume with filtering and pagination' })
  @ApiParam({ name: 'resumeId', type: String, description: 'Resume ID' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'tag', type: String, required: false })
  @ApiQuery({ name: 'sortBy', type: String, required: false })
  @ApiQuery({ name: 'sortOrder', enum: ['ASC', 'DESC'], required: false })
  async findAll(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Param('resumeId', ParseUUIDPipe) resumeId: string,
    @Query() filterDto: ResumeVersionFilterDto,
  ) {
    return await this.resumeVersionsService.getVersions(req.user.userId, resumeId, filterDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get resume version statistics' })
  @ApiParam({ name: 'resumeId', type: String, description: 'Resume ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved successfully' })
  async getStats(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Param('resumeId', ParseUUIDPipe) resumeId: string,
  ) {
    return await this.resumeVersionsService.getVersionStats(req.user.userId, resumeId);
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare two resume versions' })
  @ApiParam({ name: 'resumeId', type: String, description: 'Resume ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comparison completed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'One or both versions not found' })
  async compareVersions(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Param('resumeId', ParseUUIDPipe) resumeId: string,
    @Body() body: { version1Id: string; version2Id: string },
  ) {
    return await this.resumeVersionsService.compareVersions(
      req.user.userId,
      resumeId,
      body.version1Id,
      body.version2Id,
    );
  }

  @Get(':versionId')
  @ApiOperation({ summary: 'Get a specific resume version' })
  @ApiParam({ name: 'resumeId', type: String, description: 'Resume ID' })
  @ApiParam({ name: 'versionId', type: String, description: 'Version ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Resume version retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Resume version not found' })
  async findOne(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Param('resumeId', ParseUUIDPipe) resumeId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return await this.resumeVersionsService.getVersion(req.user.userId, resumeId, versionId);
  }

  @Patch(':versionId')
  @ApiOperation({ summary: 'Update a resume version (tag and notes only)' })
  @ApiParam({ name: 'resumeId', type: String, description: 'Resume ID' })
  @ApiParam({ name: 'versionId', type: String, description: 'Version ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Resume version updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Resume version not found' })
  async update(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Param('resumeId', ParseUUIDPipe) resumeId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() updateDto: UpdateResumeVersionDto,
  ) {
    return await this.resumeVersionsService.updateVersion(
      req.user.userId,
      resumeId,
      versionId,
      updateDto,
    );
  }

  @Post(':versionId/restore')
  @ApiOperation({ summary: 'Restore a resume version (create new version from selected)' })
  @ApiParam({ name: 'resumeId', type: String, description: 'Resume ID' })
  @ApiParam({ name: 'versionId', type: String, description: 'Version ID to restore' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Resume version restored successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Resume version not found' })
  async restore(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Param('resumeId', ParseUUIDPipe) resumeId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return await this.resumeVersionsService.restoreVersion(req.user.userId, resumeId, versionId);
  }

  @Delete(':versionId')
  @ApiOperation({ summary: 'Delete a resume version' })
  @ApiParam({ name: 'resumeId', type: String, description: 'Resume ID' })
  @ApiParam({ name: 'versionId', type: String, description: 'Version ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Resume version deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Resume version not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot delete the last remaining version' })
  async remove(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Param('resumeId', ParseUUIDPipe) resumeId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    await this.resumeVersionsService.deleteVersion(req.user.userId, resumeId, versionId);
    return { message: 'Resume version deleted successfully' };
  }
}