import { registerAs } from "@nestjs/config";

export const DatabaseConfig = registerAs("database", () => ({
  type: "postgres",
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_HOST || process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || "5432"),
  username:
    process.env.DATABASE_USERNAME || process.env.DB_USERNAME || "postgres",
  password:
    process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || "password",
  database: process.env.DATABASE_NAME || process.env.DB_NAME || "qoder_resume",
  synchronize: process.env.NODE_ENV === "development",
  logging: process.env.NODE_ENV === "development",
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
}));
