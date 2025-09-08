import { Controller, Get, Header } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { MetricsService } from "../services/metrics.service";

@ApiTags("Monitoring")
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: "Get Prometheus metrics" })
  @ApiResponse({ status: 200, description: "Metrics retrieved successfully" })
  @Header("Content-Type", "text/plain")
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
