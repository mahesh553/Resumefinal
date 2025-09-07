import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

// Simple UUID generator function
function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Request context interface
export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  userAgent: string;
  ip: string;
  startTime: number;
  method: string;
  url: string;
  headers: Record<string, string>;
}

// Extend Request interface to include context
declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

// Request context middleware
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestContextMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    // Generate or use existing request ID
    const requestId = (req.headers["x-request-id"] as string) || generateUuid();

    // Extract user information if available
    const userId = (req as any).user?.id;
    const sessionId = req.headers["x-session-id"] as string;

    // Create request context
    const context: RequestContext = {
      requestId,
      userId,
      sessionId,
      userAgent: req.headers["user-agent"] || "unknown",
      ip: req.ip || req.connection.remoteAddress || "unknown",
      startTime: Date.now(),
      method: req.method,
      url: req.url,
      headers: req.headers as Record<string, string>,
    };

    // Attach context to request
    req.context = context;

    // Set response headers
    res.setHeader("X-Request-ID", requestId);
    res.setHeader("X-Response-Time", "0"); // Will be updated on response

    // Log request start
    this.logger.log(`${req.method} ${req.url} - Started`, {
      requestId,
      userId,
      method: req.method,
      url: req.url,
      userAgent: context.userAgent,
      ip: context.ip,
    });

    next();
  }
}

// Response logging middleware
@Injectable()
export class ResponseLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ResponseLoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const originalSend = res.send;
    const originalJson = res.json;
    const startTime = Date.now();

    // Override response methods to capture response data
    res.send = function (body) {
      ResponseLoggingMiddleware.prototype.logResponse.call(
        ResponseLoggingMiddleware.prototype,
        req,
        res,
        body,
        startTime
      );
      return originalSend.call(this, body);
    };

    res.json = function (body) {
      ResponseLoggingMiddleware.prototype.logResponse.call(
        ResponseLoggingMiddleware.prototype,
        req,
        res,
        body,
        startTime
      );
      return originalJson.call(this, body);
    };

    next();
  }

  private logResponse(
    req: Request,
    res: Response,
    body: any,
    startTime: number
  ): void {
    const responseTime = Date.now() - startTime;
    const context = req.context;
    const statusCode = res.statusCode;
    const contentLength = res.get("content-length") || 0;

    // Update response time header
    res.setHeader("X-Response-Time", `${responseTime}ms`);

    // Determine log level based on status code
    const isError = statusCode >= 400;
    const isWarning = statusCode >= 300 && statusCode < 400;

    const logData = {
      requestId: context?.requestId,
      userId: context?.userId,
      method: req.method,
      url: req.url,
      statusCode,
      responseTime,
      contentLength,
      userAgent: context?.userAgent,
      ip: context?.ip,
    };

    const message = `${req.method} ${req.url} - ${statusCode} - ${responseTime}ms`;

    if (isError) {
      this.logger.error(message, {
        ...logData,
        ...(statusCode >= 500 &&
          process.env.NODE_ENV === "development" && {
            responseBody: this.sanitizeResponseBody(body),
          }),
      });
    } else if (isWarning) {
      this.logger.warn(message, logData);
    } else {
      this.logger.log(message, logData);
    }
  }

  private sanitizeResponseBody(body: any): any {
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        return this.removeSecrets(parsed);
      } catch {
        return body.length > 1000 ? `${body.substring(0, 1000)}...` : body;
      }
    }
    return this.removeSecrets(body);
  }

  private removeSecrets(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;

    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "key",
      "authorization",
    ];
    const result = { ...obj };

    Object.keys(result).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
        result[key] = "[REDACTED]";
      } else if (typeof result[key] === "object") {
        result[key] = this.removeSecrets(result[key]);
      }
    });

    return result;
  }
}

// Error context middleware
@Injectable()
export class ErrorContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ErrorContextMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    // Capture unhandled errors in this request context
    const _originalOn = process.on;
    const _originalEmit = process.emit;

    // Track uncaught exceptions for this request
    const uncaughtExceptionHandler = (error: Error) => {
      this.logger.error("Uncaught Exception in request context", {
        requestId: req.context?.requestId,
        userId: req.context?.userId,
        method: req.method,
        url: req.url,
        error: error.message,
        stack: error.stack,
      });
    };

    const unhandledRejectionHandler = (reason: any, _promise: Promise<any>) => {
      this.logger.error("Unhandled Promise Rejection in request context", {
        requestId: req.context?.requestId,
        userId: req.context?.userId,
        method: req.method,
        url: req.url,
        reason: reason?.message || reason,
        stack: reason?.stack,
      });
    };

    // Add temporary error listeners
    process.on("uncaughtException", uncaughtExceptionHandler);
    process.on("unhandledRejection", unhandledRejectionHandler);

    // Remove listeners when request completes
    const cleanup = () => {
      process.removeListener("uncaughtException", uncaughtExceptionHandler);
      process.removeListener("unhandledRejection", unhandledRejectionHandler);
    };

    res.on("finish", cleanup);
    res.on("close", cleanup);

    next();
  }
}

// Performance monitoring middleware
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);
  private readonly slowRequestThreshold = 1000; // 1 second
  private readonly memoryCheckInterval = 10000; // 10 seconds
  private lastMemoryCheck = 0;

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    // Check system memory periodically
    this.checkSystemMemory();

    // Monitor request completion
    res.on("finish", () => {
      this.logPerformanceMetrics(req, startTime, startMemory);
    });

    next();
  }

  private logPerformanceMetrics(
    req: Request,
    startTime: bigint,
    startMemory: NodeJS.MemoryUsage
  ): void {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

    const metrics = {
      requestId: req.context?.requestId,
      method: req.method,
      url: req.url,
      duration,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external,
      },
      finalMemory: endMemory,
    };

    // Log slow requests
    if (duration > this.slowRequestThreshold) {
      this.logger.warn(
        `Slow request detected: ${req.method} ${req.url} took ${duration.toFixed(2)}ms`,
        metrics
      );
    }

    // Log high memory usage
    const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
    if (memoryIncrease > 50 * 1024 * 1024) {
      // 50MB increase
      this.logger.warn(
        `High memory usage detected: ${req.method} ${req.url} used ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
        metrics
      );
    }

    // Log performance metrics in development
    if (process.env.NODE_ENV === "development") {
      this.logger.debug("Request performance metrics", metrics);
    }
  }

  private checkSystemMemory(): void {
    const now = Date.now();
    if (now - this.lastMemoryCheck < this.memoryCheckInterval) {
      return;
    }

    this.lastMemoryCheck = now;
    const memory = process.memoryUsage();
    const memoryInMB = {
      rss: (memory.rss / 1024 / 1024).toFixed(2),
      heapUsed: (memory.heapUsed / 1024 / 1024).toFixed(2),
      heapTotal: (memory.heapTotal / 1024 / 1024).toFixed(2),
      external: (memory.external / 1024 / 1024).toFixed(2),
    };

    // Warn if memory usage is high
    if (memory.heapUsed > 500 * 1024 * 1024) {
      // 500MB
      this.logger.warn("High memory usage detected", memoryInMB);
    }

    this.logger.debug("System memory usage", memoryInMB);
  }
}

// Security headers middleware
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Set security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()"
    );

    // HSTS header for HTTPS
    if (req.secure || req.headers["x-forwarded-proto"] === "https") {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }

    // CSP header (adjust based on your needs)
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https:; object-src 'none'; media-src 'self'; form-action 'self'; frame-ancestors 'none';"
    );

    next();
  }
}

// Rate limiting context middleware
@Injectable()
export class RateLimitContextMiddleware implements NestMiddleware {
  private readonly requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly cleanupInterval = 60000; // 1 minute
  private lastCleanup = 0;

  use(req: Request, res: Response, next: NextFunction): void {
    const clientId = this.getClientId(req);
    const now = Date.now();

    // Cleanup old entries
    this.cleanup(now);

    // Get or create rate limit entry
    let rateLimitEntry = this.requestCounts.get(clientId);
    if (!rateLimitEntry || now > rateLimitEntry.resetTime) {
      rateLimitEntry = {
        count: 0,
        resetTime: now + 60000, // 1 minute window
      };
      this.requestCounts.set(clientId, rateLimitEntry);
    }

    rateLimitEntry.count++;

    // Add rate limit headers
    res.setHeader("X-RateLimit-Limit", "100"); // 100 requests per minute
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, 100 - rateLimitEntry.count)
    );
    res.setHeader("X-RateLimit-Reset", rateLimitEntry.resetTime);

    // Add rate limit info to request context
    if (req.context) {
      (req.context as any).rateLimit = {
        count: rateLimitEntry.count,
        remaining: Math.max(0, 100 - rateLimitEntry.count),
        resetTime: rateLimitEntry.resetTime,
      };
    }

    next();
  }

  private getClientId(req: Request): string {
    // Use user ID if authenticated, otherwise use IP
    const userId = (req as any).user?.id;
    if (userId) {
      return `user:${userId}`;
    }

    const ip = req.ip || req.connection.remoteAddress || "unknown";
    return `ip:${ip}`;
  }

  private cleanup(now: number): void {
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }

    this.lastCleanup = now;
    for (const [key, entry] of this.requestCounts.entries()) {
      if (now > entry.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }
}
