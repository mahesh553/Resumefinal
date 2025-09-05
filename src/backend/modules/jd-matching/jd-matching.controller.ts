import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { 
  ApiBearerAuth, 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JdMatchingService } from './jd-matching.service';
import { CreateJDMatchingDto } from './dto/jd-matching.dto';

@ApiTags('JD Matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jd-matching')
export class JdMatchingController {
  constructor(private readonly jdMatchingService: JdMatchingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new JD matching analysis' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'JD matching analysis queued successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data or resume not processed' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Resume not found' })
  async create(@Request() req: ExpressRequest & { user: { userId: string } }, @Body() createDto: CreateJDMatchingDto) {
    return await this.jdMatchingService.createMatching(req.user.userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user JD matching results with pagination' })
  @ApiQuery({ name: 'page', type: Number, required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Items per page (default: 10)' })
  async findAll(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return await this.jdMatchingService.getUserMatchings(req.user.userId, { page, limit });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get JD matching statistics for user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Statistics retrieved successfully' })
  async getStats(@Request() req: ExpressRequest & { user: { userId: string } }) {
    return await this.jdMatchingService.getMatchingStats(req.user.userId);
  }

  @Get('keywords')
  @ApiOperation({ summary: 'Get top matched and missing keywords' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Number of keywords to return (default: 20)' })
  async getTopKeywords(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ) {
    return await this.jdMatchingService.getTopKeywords(req.user.userId, limit);
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare multiple JD matching results' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comparison results retrieved successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Maximum 5 matchings can be compared' })
  async compareMatchings(
    @Request() req: ExpressRequest & { user: { userId: string } },
    @Body() body: { analysisIds: string[] },
  ) {
    return await this.jdMatchingService.compareMatchings(req.user.userId, body.analysisIds);
  }

  @Get(':analysisId')
  @ApiOperation({ summary: 'Get a specific JD matching result' })
  @ApiParam({ name: 'analysisId', type: String, description: 'Analysis ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'JD matching result retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'JD matching result not found' })
  async findOne(@Request() req: ExpressRequest & { user: { userId: string } }, @Param('analysisId', ParseUUIDPipe) analysisId: string) {
    return await this.jdMatchingService.getMatchingResult(req.user.userId, analysisId);
  }

  @Delete(':analysisId')
  @ApiOperation({ summary: 'Delete a JD matching result' })
  @ApiParam({ name: 'analysisId', type: String, description: 'Analysis ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'JD matching result deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'JD matching result not found' })
  async remove(@Request() req: ExpressRequest & { user: { userId: string } }, @Param('analysisId', ParseUUIDPipe) analysisId: string) {
    await this.jdMatchingService.deleteMatching(req.user.userId, analysisId);
    return { message: 'JD matching result deleted successfully' };
  }
}