import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { QueueService } from "./queue.service";
import { QUEUE_NAMES } from "./queue.types";

// Helper function to create Redis configuration with TLS support
function createRedisConfig(configService: ConfigService) {
  const host = configService.get("REDIS_HOST") || "localhost";
  const port = configService.get("REDIS_PORT") || 6379;
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

  return config;
}

@Module({
  imports: [
    // Register all BullMQ queues that QueueService depends on
    BullModule.registerQueueAsync(
      {
        name: QUEUE_NAMES.RESUME_ANALYSIS,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: createRedisConfig(configService),
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.BULK_ANALYSIS,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: createRedisConfig(configService),
          defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 25,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.JD_MATCHING,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: createRedisConfig(configService),
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.SUGGESTION_GENERATION,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: createRedisConfig(configService),
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.EMAIL_NOTIFICATIONS,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: createRedisConfig(configService),
          defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 25,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.SYSTEM_HEALTH,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: createRedisConfig(configService),
          defaultJobOptions: {
            removeOnComplete: 10,
            removeOnFail: 10,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.DATA_RETENTION,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: createRedisConfig(configService),
          defaultJobOptions: {
            removeOnComplete: 5,
            removeOnFail: 5,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: QUEUE_NAMES.BILLING,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: createRedisConfig(configService),
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        }),
        inject: [ConfigService],
      }
    ),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
