import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private healthService: HealthService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Get application health status' })
  @ApiResponse({ status: 200, description: 'Health check successful' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  check() {
    return this.health.check([
      // Database health check
      () => this.db.pingCheck('database'),
      
      // Custom health checks
      () => this.healthService.checkRedis(),
      () => this.healthService.checkAIProviders(),
      () => this.healthService.checkFileSystem(),
    ]);
  }

  @Get('database')
  @ApiOperation({ summary: 'Check database health' })
  async checkDatabase() {
    return this.healthService.getDatabaseMetrics();
  }

  @Get('redis')
  @ApiOperation({ summary: 'Check Redis health' })
  async checkRedis() {
    return this.healthService.getRedisMetrics();
  }

  @Get('ai-providers')
  @ApiOperation({ summary: 'Check AI providers health' })
  async checkAIProviders() {
    return this.healthService.getAIProvidersStatus();
  }

  @Get('system')
  @ApiOperation({ summary: 'Get system metrics' })
  async getSystemMetrics() {
    return this.healthService.getSystemMetrics();
  }
}