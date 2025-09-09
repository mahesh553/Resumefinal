import {
  Controller,
  Get,
  HttpStatus,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Request as ExpressRequest } from "express";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { AnalyticsService } from "../services/analytics.service";

@ApiTags("Analytics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("user-stats")
  @ApiOperation({ summary: "Get user statistics and analytics" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "User statistics retrieved successfully",
    schema: {
      type: "object",
      properties: {
        totalResumes: { type: "number" },
        averageScore: { type: "number" },
        totalJobs: { type: "number" },
        interviewCalls: { type: "number" },
        recentActivity: {
          type: "array",
          items: { type: "object" },
        },
      },
    },
  })
  async getUserStats(
    @Request() req: ExpressRequest & { user: { userId: string } }
  ) {
    return await this.analyticsService.getUserStats(req.user.userId);
  }
}
