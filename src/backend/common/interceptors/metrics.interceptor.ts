import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { MetricsService } from "../services/metrics.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const startTime = Date.now();
    const method = request.method;
    const route = request.route?.path || request.url;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = response.statusCode;
          this.metricsService.recordHttpRequest(
            method,
            route,
            statusCode,
            duration
          );
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = response.statusCode || 500;
          this.metricsService.recordHttpRequest(
            method,
            route,
            statusCode,
            duration
          );

          // Record application error
          this.metricsService.recordError(
            error.constructor.name,
            statusCode >= 500 ? "critical" : "high"
          );
        },
      })
    );
  }
}
