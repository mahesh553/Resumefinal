import { registerAs } from "@nestjs/config";
import { createClient } from "redis";

export const RedisConfig = registerAs("redis", () => {
  const host = process.env.REDIS_HOST || "localhost";
  const port = parseInt(process.env.REDIS_PORT || "6379");
  const password = process.env.REDIS_PASSWORD || undefined;
  const isCloudRedis = host && !host.includes("localhost");

  // Configuration for native redis package
  const nativeConfig = {
    username: 'default',
    password: password,
    socket: {
      host: host,
      port: port
    }
  };

  // Configuration for ioredis (backward compatibility)
  const ioredisConfig: any = {
    host,
    port,
    password,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  };

  // Enable TLS for cloud Redis services if needed
  if (isCloudRedis && process.env.REDIS_TLS_ENABLED === "true") {
    ioredisConfig.tls = {
      rejectUnauthorized: false,
    };
  }

  return {
    host,
    port,
    password,
    isCloudRedis,
    nativeConfig,
    ioredisConfig,
    // Legacy support
    ...ioredisConfig
  };
});
