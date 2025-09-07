import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Observable, throwError, TimeoutError } from "rxjs";
import { catchError, tap, timeout } from "rxjs/operators";

// Error reporting interceptor
@Injectable()
export class ErrorReportingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorReportingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap((_data) => {
        // Log successful responses if needed
        const duration = Date.now() - startTime;
        if (duration > 1000) {
          // Log slow successful requests
          this.logger.warn(
            `Slow successful request: ${request.method} ${request.url} took ${duration}ms`,
            {
              requestId: request.context?.requestId,
              method: request.method,
              url: request.url,
              duration,
              statusCode: response.statusCode,
            }
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Enhanced error logging with context
        const errorContext = {
          requestId: request.context?.requestId,
          userId: request.context?.userId,
          method: request.method,
          url: request.url,
          duration,
          userAgent: request.context?.userAgent,
          ip: request.context?.ip,
          headers: this.sanitizeHeaders(request.headers),
          body: this.sanitizeBody(request.body),
          query: request.query,
          params: request.params,
          error: {
            name: error.constructor.name,
            message: error.message,
            stack: error.stack,
            ...(error.response && { response: error.response }),
            ...(error.status && { status: error.status }),
          },
        };

        this.logger.error(
          `Request failed: ${request.method} ${request.url}`,
          errorContext
        );

        // Re-throw the error to be handled by exception filters
        return throwError(() => error);
      })
    );
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== "object") {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ["password", "token", "secret", "key"];

    Object.keys(sanitized).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        sanitized[key] = "[REDACTED]";
      }
    });

    return sanitized;
  }
}

// Timeout interceptor
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);
  private readonly defaultTimeout = 30000; // 30 seconds

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const timeoutMs = this.getTimeoutForRoute(request) || this.defaultTimeout;

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((error) => {
        if (error instanceof TimeoutError) {
          this.logger.error(
            `Request timeout: ${request.method} ${request.url} after ${timeoutMs}ms`,
            {
              requestId: request.context?.requestId,
              method: request.method,
              url: request.url,
              timeout: timeoutMs,
            }
          );

          // Convert to a proper HTTP exception
          return throwError(() => ({
            statusCode: 408,
            message: "Request timeout",
            error: "Request Timeout",
          }));
        }
        return throwError(() => error);
      })
    );
  }

  private getTimeoutForRoute(request: Request): number | null {
    // Define custom timeouts for specific routes
    const customTimeouts: Record<string, number> = {
      "/api/resume/upload": 120000, // 2 minutes for file uploads
      "/api/resume/bulk-upload": 300000, // 5 minutes for bulk uploads
      "/api/jd-matching/analyze": 60000, // 1 minute for AI analysis
      "/api/analytics": 45000, // 45 seconds for analytics
    };

    // Check for exact match
    if (customTimeouts[request.url]) {
      return customTimeouts[request.url];
    }

    // Check for pattern matches
    for (const [pattern, timeout] of Object.entries(customTimeouts)) {
      if (request.url.startsWith(pattern)) {
        return timeout;
      }
    }

    return null;
  }
}
