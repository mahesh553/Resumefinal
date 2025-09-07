import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface ErrorReport {
  id: string;
  timestamp: string;
  level: "error" | "warning" | "info";
  category:
    | "api"
    | "database"
    | "external"
    | "business"
    | "security"
    | "performance";
  message: string;
  stack?: string;
  context: {
    requestId?: string;
    userId?: string;
    method?: string;
    url?: string;
    userAgent?: string;
    ip?: string;
    statusCode?: number;
    duration?: number;
    [key: string]: any;
  };
  metadata?: {
    service?: string;
    version?: string;
    environment?: string;
    tags?: string[];
    severity?: "low" | "medium" | "high" | "critical";
  };
}

@Injectable()
export class ErrorReportingService {
  private readonly logger = new Logger(ErrorReportingService.name);
  private readonly reportingQueue: ErrorReport[] = [];
  private readonly maxQueueSize = 1000;
  private readonly batchSize = 10;
  private readonly flushInterval = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor(private configService: ConfigService) {
    this.startFlushTimer();
  }

  // Report an error
  async reportError(
    error: Error | string,
    context: Partial<ErrorReport["context"]> = {},
    metadata: Partial<ErrorReport["metadata"]> = {}
  ): Promise<void> {
    const report = this.createErrorReport("error", error, context, metadata);
    await this.addToQueue(report);
  }

  // Report a warning
  async reportWarning(
    message: string,
    context: Partial<ErrorReport["context"]> = {},
    metadata: Partial<ErrorReport["metadata"]> = {}
  ): Promise<void> {
    const report = this.createErrorReport(
      "warning",
      message,
      context,
      metadata
    );
    await this.addToQueue(report);
  }

  // Report info
  async reportInfo(
    message: string,
    context: Partial<ErrorReport["context"]> = {},
    metadata: Partial<ErrorReport["metadata"]> = {}
  ): Promise<void> {
    const report = this.createErrorReport("info", message, context, metadata);
    await this.addToQueue(report);
  }

  // Create error report
  private createErrorReport(
    level: ErrorReport["level"],
    error: Error | string,
    context: Partial<ErrorReport["context"]>,
    metadata: Partial<ErrorReport["metadata"]>
  ): ErrorReport {
    const message = typeof error === "string" ? error : error.message;
    const stack = error instanceof Error ? error.stack : undefined;
    const category = this.categorizeError(error, context);
    const severity = this.determineSeverity(level, category, context);

    return {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      stack,
      context: {
        ...context,
      },
      metadata: {
        service: "qoder-resume-backend",
        version: process.env.npm_package_version || "1.0.0",
        environment: this.configService.get("NODE_ENV", "development"),
        severity,
        ...metadata,
      },
    };
  }

  // Categorize error based on content and context
  private categorizeError(
    error: Error | string,
    context: Partial<ErrorReport["context"]>
  ): ErrorReport["category"] {
    const message = typeof error === "string" ? error : error.message;
    const messageLower = message.toLowerCase();
    const url = context.url || "";

    // Database errors
    if (
      messageLower.includes("database") ||
      messageLower.includes("query") ||
      messageLower.includes("connection") ||
      messageLower.includes("typeorm")
    ) {
      return "database";
    }

    // External service errors
    if (
      messageLower.includes("external service") ||
      messageLower.includes("api") ||
      messageLower.includes("http") ||
      messageLower.includes("fetch")
    ) {
      return "external";
    }

    // Security errors
    if (
      messageLower.includes("unauthorized") ||
      messageLower.includes("forbidden") ||
      messageLower.includes("authentication") ||
      messageLower.includes("authorization") ||
      url.includes("/auth/")
    ) {
      return "security";
    }

    // Performance errors
    if (
      messageLower.includes("timeout") ||
      messageLower.includes("slow") ||
      messageLower.includes("memory") ||
      (context.duration && context.duration > 5000)
    ) {
      return "performance";
    }

    // Business logic errors
    if (
      messageLower.includes("validation") ||
      messageLower.includes("business") ||
      messageLower.includes("rule")
    ) {
      return "business";
    }

    // Default to API errors
    return "api";
  }

  // Determine severity based on level, category, and context
  private determineSeverity(
    level: ErrorReport["level"],
    category: ErrorReport["category"],
    context: Partial<ErrorReport["context"]>
  ): "low" | "medium" | "high" | "critical" {
    // Critical errors
    if (
      level === "error" &&
      (category === "database" ||
        category === "security" ||
        (context.statusCode && context.statusCode >= 500))
    ) {
      return "critical";
    }

    // High severity errors
    if (
      level === "error" &&
      (category === "external" ||
        category === "performance" ||
        (context.statusCode && context.statusCode >= 400))
    ) {
      return "high";
    }

    // Medium severity
    if (level === "error" || level === "warning") {
      return "medium";
    }

    // Low severity
    return "low";
  }

  // Add report to queue
  private async addToQueue(report: ErrorReport): Promise<void> {
    this.reportingQueue.push(report);

    // Trim queue if it's too large
    if (this.reportingQueue.length > this.maxQueueSize) {
      const removed = this.reportingQueue.splice(
        0,
        this.reportingQueue.length - this.maxQueueSize
      );
      this.logger.warn(
        `Error reporting queue overflow. Removed ${removed.length} old reports.`
      );
    }

    // Flush immediately for critical errors
    if (report.metadata?.severity === "critical") {
      await this.flush();
    }
  }

  // Start flush timer
  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      await this.flush();
    }, this.flushInterval);
  }

  // Flush reports
  private async flush(): Promise<void> {
    if (this.reportingQueue.length === 0) {
      return;
    }

    const batch = this.reportingQueue.splice(0, this.batchSize);

    try {
      await this.sendReports(batch);
      this.logger.debug(`Flushed ${batch.length} error reports`);
    } catch (error) {
      this.logger.error("Failed to flush error reports", {
        error: (error as Error).message,
        batchSize: batch.length,
      });

      // Re-add failed reports to the front of the queue
      this.reportingQueue.unshift(...batch);
    }
  }

  // Send reports to external service
  private async sendReports(reports: ErrorReport[]): Promise<void> {
    const reportingEndpoint = this.configService.get(
      "ERROR_REPORTING_ENDPOINT"
    );

    if (!reportingEndpoint) {
      // If no endpoint configured, just log to console
      reports.forEach((report) => {
        const logMethod =
          report.level === "error"
            ? this.logger.error
            : report.level === "warning"
              ? this.logger.warn
              : this.logger.log;

        logMethod(`[${report.category.toUpperCase()}] ${report.message}`, {
          id: report.id,
          context: report.context,
          metadata: report.metadata,
          ...(report.stack && { stack: report.stack }),
        });
      });
      return;
    }

    // Send to external service
    const response = await fetch(reportingEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.configService.get("ERROR_REPORTING_API_KEY")}`,
      },
      body: JSON.stringify({ reports }),
    });

    if (!response.ok) {
      throw new Error(
        `Error reporting service responded with ${response.status}`
      );
    }
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get queue status
  getQueueStatus(): {
    queueSize: number;
    maxQueueSize: number;
    batchSize: number;
    flushInterval: number;
  } {
    return {
      queueSize: this.reportingQueue.length,
      maxQueueSize: this.maxQueueSize,
      batchSize: this.batchSize,
      flushInterval: this.flushInterval,
    };
  }

  // Force flush (admin function)
  async forceFlush(): Promise<void> {
    await this.flush();
  }

  // Clear queue (admin function)
  clearQueue(): void {
    const cleared = this.reportingQueue.length;
    this.reportingQueue.length = 0;
    this.logger.warn(`Manually cleared ${cleared} error reports from queue`);
  }

  // Cleanup on module destroy
  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Flush remaining reports
    this.flush().catch((error) => {
      this.logger.error(
        "Failed to flush remaining error reports on shutdown",
        error
      );
    });
  }
}
