import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { APMService } from "../services/apm.service";

// Extend Request interface for custom properties
declare global {
  namespace Express {
    interface Request {
      performanceStart?: {
        time: bigint;
        cpu: NodeJS.CpuUsage;
        memory: NodeJS.MemoryUsage;
      };
      correlationId?: string;
    }
  }
}

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  constructor(private readonly apmService: APMService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = process.hrtime.bigint();
    const startCpuUsage = process.cpuUsage();
    const startMemoryUsage = process.memoryUsage();

    // Add performance tracking to request
    req.performanceStart = {
      time: startTime,
      cpu: startCpuUsage,
      memory: startMemoryUsage,
    };

    // Track when response finishes
    res.on("finish", () => {
      const endTime = process.hrtime.bigint();
      const endCpuUsage = process.cpuUsage(startCpuUsage);
      const endMemoryUsage = process.memoryUsage();

      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const cpuTime = (endCpuUsage.user + endCpuUsage.system) / 1000; // Convert to milliseconds

      const performanceData = {
        type: "request_performance",
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        cpuTime,
        memoryDelta: {
          rss: endMemoryUsage.rss - startMemoryUsage.rss,
          heapUsed: endMemoryUsage.heapUsed - startMemoryUsage.heapUsed,
          heapTotal: endMemoryUsage.heapTotal - startMemoryUsage.heapTotal,
        },
        correlationId: req.correlationId,
      };

      // Log performance data
      this.apmService.logPerformance(
        `${req.method} ${req.url}`,
        duration,
        performanceData
      );

      // Log slow requests as warnings
      if (duration > 5000) {
        // 5 seconds
        this.apmService.warn(
          `Slow request detected: ${req.method} ${req.url}`,
          "PerformanceMiddleware",
          performanceData
        );
      }

      // Log memory-intensive requests
      if (performanceData.memoryDelta.heapUsed > 50 * 1024 * 1024) {
        // 50MB
        this.apmService.warn(
          `Memory-intensive request: ${req.method} ${req.url}`,
          "PerformanceMiddleware",
          performanceData
        );
      }
    });

    next();
  }
}
