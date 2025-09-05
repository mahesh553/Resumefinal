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
  ParseEnumPipe,
} from '@nestjs/common';
import { 
  ApiBearerAuth, 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobTrackerService } from './job-tracker.service';
import { JobStatus } from '../../database/entities/job-application.entity';
import {
  CreateJobApplicationDto,
  UpdateJobApplicationDto,
  JobApplicationFilterDto,
} from './dto/job-application.dto';

@ApiTags('Job Tracker')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-tracker')
export class JobTrackerController {
  constructor(private readonly jobTrackerService: JobTrackerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job application' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Job application created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  async create(@Request() req: ExpressRequest & { user: { userId: string } }, @Body() createDto: CreateJobApplicationDto) {
    return await this.jobTrackerService.create(req.user.userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all job applications with filtering and pagination' })
  @ApiQuery({ name: 'status', enum: JobStatus, required: false })
  @ApiQuery({ name: 'vendorName', type: String, required: false })
  @ApiQuery({ name: 'location', type: String, required: false })
  @ApiQuery({ name: 'appliedAfter', type: String, required: false })
  @ApiQuery({ name: 'appliedBefore', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'sortBy', type: String, required: false })
  @ApiQuery({ name: 'sortOrder', enum: ['ASC', 'DESC'], required: false })
  async findAll(@Request() req: ExpressRequest & { user: { userId: string } }, @Query() filterDto: JobApplicationFilterDto) {
    return await this.jobTrackerService.findAll(req.user.userId, filterDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get job application statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status counts retrieved successfully' })
  async getStats(@Request() req: ExpressRequest & { user: { userId: string } }) {
    const statusCounts = await this.jobTrackerService.getStatusCounts(req.user.userId);
    const recentActivity = await this.jobTrackerService.getRecentActivity(req.user.userId);
    const upcomingFollowUps = await this.jobTrackerService.getUpcomingFollowUps(req.user.userId);
    const upcomingInterviews = await this.jobTrackerService.getUpcomingInterviews(req.user.userId);

    return {
      statusCounts,
      recentActivity,
      upcomingFollowUps,
      upcomingInterviews,
    };
  }

  @Get('upcoming-followups')
  @ApiOperation({ summary: 'Get upcoming follow-ups' })
  @ApiQuery({ name: 'days', type: Number, required: false, description: 'Number of days to look ahead (default: 7)' })
  async getUpcomingFollowUps(@Request() req: ExpressRequest & { user: { userId: string } }, @Query('days') days?: number) {
    return await this.jobTrackerService.getUpcomingFollowUps(req.user.userId, days);
  }

  @Get('upcoming-interviews')
  @ApiOperation({ summary: 'Get upcoming interviews' })
  @ApiQuery({ name: 'days', type: Number, required: false, description: 'Number of days to look ahead (default: 14)' })
  async getUpcomingInterviews(@Request() req: ExpressRequest & { user: { userId: string } }, @Query('days') days?: number) {
    return await this.jobTrackerService.getUpcomingInterviews(req.user.userId, days);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific job application' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Job application retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job application not found' })
  async findOne(@Request() req: ExpressRequest & { user: { userId: string } }, @Param('id', ParseUUIDPipe) id: string) {
    return await this.jobTrackerService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job application' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Job application updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job application not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  async update(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateJobApplicationDto,
  ) {
    return await this.jobTrackerService.update(req.user.userId, id, updateDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update job application status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job application not found' })
  async updateStatus(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status', new ParseEnumPipe(JobStatus)) status: JobStatus,
  ) {
    return await this.jobTrackerService.updateStatus(req.user.userId, id, status);
  }

  @Patch('bulk/status')
  @ApiOperation({ summary: 'Bulk update job application statuses' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bulk update completed' })
  async bulkUpdateStatus(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Body() body: { jobIds: string[]; status: JobStatus },
  ) {
    return await this.jobTrackerService.bulkUpdateStatus(
      req.user.userId,
      body.jobIds,
      body.status,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job application' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Job application deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job application not found' })
  async remove(@Request() req: ExpressRequest & { user: { userId: string } }, @Param('id', ParseUUIDPipe) id: string) {
    await this.jobTrackerService.remove(req.user.userId, id);
    return { message: 'Job application deleted successfully' };
  }
}