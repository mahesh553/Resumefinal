import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MetricsController } from "./controllers/metrics.controller";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";
import { MetricsInterceptor } from "./interceptors/metrics.interceptor";
import { PerformanceMiddleware } from "./middleware/performance.middleware";
import { APMService } from "./services/apm.service";
import { MetricsService } from "./services/metrics.service";

@Global()
@Module({
  providers: [
    MetricsService,
    APMService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  controllers: [MetricsController],
  exports: [MetricsService, APMService],
})
export class MonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PerformanceMiddleware).forRoutes("*");
  }
}
