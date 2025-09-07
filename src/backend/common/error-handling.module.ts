import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import {
  DatabaseExceptionFilter,
  GlobalExceptionFilter,
  HttpExceptionFilter,
  ValidationExceptionFilter,
} from "./filters/exception.filters";
import { RateLimitGuard } from "./guards/rate-limit.guard";
import { ErrorReportingInterceptor } from "./interceptors/error-reporting.interceptor";
import {
  ErrorContextMiddleware,
  PerformanceMiddleware,
  RateLimitContextMiddleware,
  RequestContextMiddleware,
  ResponseLoggingMiddleware,
  SecurityHeadersMiddleware,
} from "./middleware/error-context.middleware";
import { ErrorReportingService } from "./services/error-reporting.service";

@Module({
  providers: [
    // Error reporting service
    ErrorReportingService,

    // Global exception filters
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: DatabaseExceptionFilter,
    },

    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorReportingInterceptor,
    },

    // Global guards
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  exports: [ErrorReportingService],
})
export class ErrorHandlingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        SecurityHeadersMiddleware,
        RequestContextMiddleware,
        RateLimitContextMiddleware,
        ErrorContextMiddleware,
        PerformanceMiddleware,
        ResponseLoggingMiddleware
      )
      .forRoutes("*");
  }
}
