import { Injectable, LoggerService } from "@nestjs/common";
import * as winston from "winston";
import { MetricsService } from "./metrics.service";

@Injectable()
export class APMService implements LoggerService {
  private logger: winston.Logger;

  constructor(private readonly metricsService: MetricsService) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(
          ({ timestamp, level, message, stack, ...meta }) => {
            return JSON.stringify({
              timestamp,
              level,
              message,
              stack,
              service: "qoder-resume",
              environment: process.env.NODE_ENV || "development",
              ...meta,
            });
          }
        )
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: "logs/error.log",
          level: "error",
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 10,
        }),
        new winston.transports.File({
          filename: "logs/combined.log",
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 10,
        }),
        new winston.transports.File({
          filename: "logs/performance.log",
          level: "info",
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              if (meta.type === "performance") {
                return JSON.stringify({
                  timestamp,
                  level,
                  message,
                  ...meta,
                });
              }
              return ""; // Return empty string instead of null
            })
          ),
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 5,
        }),
      ],
    });
  }

  log(message: any, context?: string, meta?: any) {
    this.logger.info(message, { context, ...meta });
  }

  error(message: any, stack?: string, context?: string, meta?: any) {
    this.logger.error(message, { stack, context, ...meta });

    // Record error metrics
    this.metricsService.recordError(
      context || "unknown",
      meta?.severity || "medium"
    );
  }

  warn(message: any, context?: string, meta?: any) {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: any, context?: string, meta?: any) {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: any, context?: string, meta?: any) {
    this.logger.verbose(message, { context, ...meta });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, metadata?: any) {
    this.logger.info("Performance metric", {
      type: "performance",
      operation,
      duration,
      ...metadata,
    });
  }

  /**
   * Log business events
   */
  logBusinessEvent(event: string, userId?: string, metadata?: any) {
    this.logger.info("Business event", {
      type: "business",
      event,
      userId,
      ...metadata,
    });
  }

  /**
   * Log security events
   */
  logSecurityEvent(
    event: string,
    userId?: string,
    ipAddress?: string,
    metadata?: any
  ) {
    this.logger.warn("Security event", {
      type: "security",
      event,
      userId,
      ipAddress,
      ...metadata,
    });
  }

  /**
   * Log API requests with performance data
   */
  logApiRequest(req: any, res: any, responseTime: number) {
    const logData = {
      type: "api_request",
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.headers["user-agent"],
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
    };

    if (res.statusCode >= 400) {
      this.logger.error("API Error", logData);
    } else {
      this.logger.info("API Request", logData);
    }
  }

  /**
   * Log database operations
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    error?: any
  ) {
    const logData = {
      type: "database",
      operation,
      table,
      duration,
      success,
      error: error?.message,
    };

    if (success) {
      this.logger.info("Database operation", logData);
    } else {
      this.logger.error("Database operation failed", logData);
    }

    // Record database metrics
    this.metricsService.recordDatabaseQuery(
      operation,
      duration / 1000,
      success
    );
  }

  /**
   * Log queue operations
   */
  logQueueOperation(
    queueName: string,
    jobType: string,
    operation: string,
    duration?: number,
    success?: boolean,
    error?: any
  ) {
    const logData = {
      type: "queue",
      queueName,
      jobType,
      operation,
      duration,
      success,
      error: error?.message,
    };

    if (success === false) {
      this.logger.error("Queue operation failed", logData);
    } else {
      this.logger.info("Queue operation", logData);
    }

    // Record queue metrics if duration is provided
    if (duration !== undefined && success !== undefined) {
      this.metricsService.recordQueueJob(
        queueName,
        jobType,
        duration / 1000,
        success ? "success" : "error"
      );
    }
  }

  /**
   * Log AI provider operations
   */
  logAiOperation(
    provider: string,
    operation: string,
    duration: number,
    success: boolean,
    tokensUsed?: any,
    error?: any
  ) {
    const logData = {
      type: "ai",
      provider,
      operation,
      duration,
      success,
      tokensUsed,
      error: error?.message,
    };

    if (success) {
      this.logger.info("AI operation", logData);
    } else {
      this.logger.error("AI operation failed", logData);
    }

    // Record AI metrics
    this.metricsService.recordAiRequest(
      provider,
      operation,
      duration / 1000,
      success ? "success" : "error",
      tokensUsed
    );
  }

  /**
   * Log authentication events
   */
  logAuthEvent(
    event: string,
    userId?: string,
    success?: boolean,
    method?: string,
    ipAddress?: string,
    error?: any
  ) {
    const logData = {
      type: "auth",
      event,
      userId,
      success,
      method,
      ipAddress,
      error: error?.message,
    };

    if (success === false) {
      this.logger.warn("Authentication failed", logData);
      this.logSecurityEvent("auth_failure", userId, ipAddress, {
        method,
        error: error?.message,
      });
    } else {
      this.logger.info("Authentication event", logData);
    }

    // Record auth metrics
    if (success !== undefined) {
      this.metricsService.recordAuthAttempt(
        method || "unknown",
        success,
        error?.message
      );
    }
  }

  /**
   * Log file operations
   */
  logFileOperation(
    operation: string,
    filename: string,
    size?: number,
    success?: boolean,
    error?: any
  ) {
    const logData = {
      type: "file",
      operation,
      filename,
      size,
      success,
      error: error?.message,
    };

    if (success === false) {
      this.logger.error("File operation failed", logData);
    } else {
      this.logger.info("File operation", logData);
    }

    // Record file metrics
    if (success !== undefined) {
      const fileType = filename.split(".").pop() || "unknown";
      this.metricsService.recordFileOperation(
        operation,
        success,
        size,
        fileType
      );
    }
  }

  /**
   * Create a timer for measuring operation duration
   */
  startTimer(operation: string): () => number {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.logPerformance(operation, duration);
      return duration;
    };
  }

  /**
   * Log correlation for tracing requests across services
   */
  logWithCorrelation(
    level: string,
    message: string,
    correlationId: string,
    metadata?: any
  ) {
    this.logger.log(level, message, {
      correlationId,
      ...metadata,
    });
  }
}
