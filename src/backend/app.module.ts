import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MonitoringModule } from "./common/monitoring.module";
import * as entities from "./database/entities";
import { AdminModule } from "./modules/admin/admin.module";
import { AIModule } from "./modules/ai/ai.module";
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

        // Base configuration
        const config = {
          type: "postgres" as const,
          entities: Object.values(entities),
          synchronize: configService.get("NODE_ENV") === "development",
          logging: configService.get("NODE_ENV") === "development",
          ssl:
            configService.get("NODE_ENV") === "production"
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
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get("REDIS_HOST"),
          port: configService.get("REDIS_PORT"),
          password: configService.get("REDIS_PASSWORD"),
        },
      }),
      inject: [ConfigService],
    }),

    // Application modules
    AuthModule,
    AIModule,
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
