import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MonitoringModule } from "./common/monitoring.module";
import * as entities from "./database/entities";
import { AdminModule } from "./modules/admin/admin.module";
import { AIModule } from "./modules/ai/ai.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { JdMatchingModule } from "./modules/jd-matching/jd-matching.module";
import { JobTrackerModule } from "./modules/job-tracker/job-tracker.module";
import { ResumeAnalysisModule } from "./modules/resume-analysis/resume-analysis.module";
import { ResumeVersionsModule } from "./modules/resume-versions/resume-versions.module";
import { WebSocketModule } from "./modules/websocket/websocket.module";
import { QueueProcessorModule } from "./queues/queue-processor.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>("DATABASE_URL");
        const isSupabase = databaseUrl?.includes("supabase.co");
        const dbSynchronize = configService.get<string>("DB_SYNCHRONIZE");

        // Determine synchronization strategy
        let shouldSynchronize = false;
        if (dbSynchronize !== undefined) {
          // Explicit control via DB_SYNCHRONIZE environment variable
          shouldSynchronize = dbSynchronize === "true";
        } else {
          // Default behavior: only sync in development and not with Supabase
          shouldSynchronize =
            configService.get("NODE_ENV") === "development" && !isSupabase;
        }

        // Base configuration
        const config = {
          type: "postgres" as const,
          entities: Object.values(entities),
          synchronize: shouldSynchronize,
          logging: configService.get("NODE_ENV") === "development",
          ssl:
            isSupabase || configService.get("NODE_ENV") === "production"
              ? { rejectUnauthorized: false }
              : false,
        };

        // If DATABASE_URL is provided (e.g., Supabase), use it
        if (databaseUrl) {
          return {
            ...config,
            url: databaseUrl,
          };
        }

        // Otherwise use individual connection parameters
        return {
          ...config,
          host:
            configService.get<string>("DATABASE_HOST") ||
            configService.get<string>("DB_HOST") ||
            "localhost",
          port: parseInt(
            configService.get<string>("DATABASE_PORT") ||
              configService.get<string>("DB_PORT") ||
              "5432"
          ),
          username:
            configService.get<string>("DATABASE_USERNAME") ||
            configService.get<string>("DB_USERNAME") ||
            "postgres",
          password:
            configService.get<string>("DATABASE_PASSWORD") ||
            configService.get<string>("DB_PASSWORD") ||
            "password",
          database:
            configService.get<string>("DATABASE_NAME") ||
            configService.get<string>("DB_NAME") ||
            "qoder_resume",
        };
      },
      inject: [ConfigService],
    }),

    // Redis/BullMQ configuration
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get("REDIS_HOST");
        const port = configService.get("REDIS_PORT");
        const password = configService.get("REDIS_PASSWORD");
        const isCloudRedis = host && !host.includes("localhost");

        const config: any = {
          host,
          port,
          password,
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
          lazyConnect: true,
        };

        // Enable TLS for cloud Redis services if needed
        if (isCloudRedis && configService.get("REDIS_TLS_ENABLED") === "true") {
          config.tls = {
            rejectUnauthorized: false,
          };
        }

        return {
          redis: config,
        };
      },
      inject: [ConfigService],
    }),

    // Application modules
    AuthModule,
    AIModule,
    AnalyticsModule,
    ResumeAnalysisModule,
    JobTrackerModule,
    JdMatchingModule,
    ResumeVersionsModule,
    AdminModule,
    HealthModule,
    WebSocketModule,

    // Queue processing
    QueueProcessorModule,

    // Monitoring
    MonitoringModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
