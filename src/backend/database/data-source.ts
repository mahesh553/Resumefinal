import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import * as entities from "./entities";

export const createDataSource = (configService: ConfigService) => {
  const databaseUrl = configService.get("DATABASE_URL");
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

  // If DATABASE_URL is provided, use it (for Supabase/production)
  if (databaseUrl) {
    return new DataSource({
      type: "postgres",
      url: databaseUrl,
      entities: Object.values(entities),
      migrations: [__dirname + "/migrations/*.{ts,js}"],
      synchronize: shouldSynchronize,
      logging: configService.get("NODE_ENV") === "development",
      ssl:
        isSupabase || configService.get("NODE_ENV") === "production"
          ? { rejectUnauthorized: false }
          : false,
    });
  }

  // Otherwise use individual connection parameters (for local development)
  return new DataSource({
    type: "postgres",
    host: configService.get("DATABASE_HOST") || configService.get("DB_HOST"),
    port: configService.get("DATABASE_PORT") || configService.get("DB_PORT"),
    username:
      configService.get("DATABASE_USERNAME") ||
      configService.get("DB_USERNAME"),
    password:
      configService.get("DATABASE_PASSWORD") ||
      configService.get("DB_PASSWORD"),
    database:
      configService.get("DATABASE_NAME") || configService.get("DB_NAME"),
    entities: Object.values(entities),
    migrations: [__dirname + "/migrations/*.{ts,js}"],
    synchronize: shouldSynchronize,
    logging: configService.get("NODE_ENV") === "development",
    ssl:
      isSupabase || configService.get("NODE_ENV") === "production"
        ? { rejectUnauthorized: false }
        : false,
  });
};
