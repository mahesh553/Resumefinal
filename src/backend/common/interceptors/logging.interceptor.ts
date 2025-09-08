import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { v4 as uuidv4 } from "uuid";
import { APMService } from "../services/apm.service";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly apmService: APMService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Generate correlation ID for request tracing
    const correlationId = uuidv4();
    request.correlationId = correlationId;
    response.setHeader("X-Correlation-ID", correlationId);

    const startTime = Date.now();
    const { method, url, ip, headers } = request;
    const userAgent = headers["user-agent"] || "";
    const userId = request.user?.id;

    // Log request start
    this.apmService.logWithCorrelation(
      "info",
      `Incoming ${method} ${url}`,
      correlationId,
      {
        type: "request_start",
        method,
        url,
        ip,
        userAgent,
        userId,
      }
    );

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log successful request
        this.apmService.logApiRequest(request, response, responseTime);

        this.apmService.logWithCorrelation(
          "info",
          `Completed ${method} ${url} - ${statusCode}`,
          correlationId,
          {
            type: "request_complete",
            method,
            url,
            statusCode,
            responseTime,
            userId,
          }
        );
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Log error request
        this.apmService.logApiRequest(request, { statusCode }, responseTime);

        this.apmService.logWithCorrelation(
          "error",
          `Failed ${method} ${url} - ${statusCode}: ${error.message}`,
          correlationId,
          {
            type: "request_error",
            method,
            url,
            statusCode,
            responseTime,
            error: error.message,
            stack: error.stack,
            userId,
          }
        );

        throw error;
      })
    );
  }
}
