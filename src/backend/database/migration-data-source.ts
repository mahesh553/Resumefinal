import * as dotenv from "dotenv";
import * as path from "path";
import { DataSource } from "typeorm";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

>>>>>>> a169ee0935b3ca30a1b9c2fb30c978ac3dc062f0
// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if using Supabase
const isSupabase = process.env.DATABASE_URL?.includes("supabase.co");
=======
>>>>>>> a169ee0935b3ca30a1b9c2fb30c978ac3dc062f0

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432"),
  username: process.env.DATABASE_USERNAME || "postgres",
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || "qoder_resume",
  entities: [__dirname + "/entities/*.entity.{ts,js}"],
  synchronize: false, // Always false for production
  logging: process.env.NODE_ENV === "development",
  ssl:
    process.env.NODE_ENV === "production"
>>>>>>> a169ee0935b3ca30a1b9c2fb30c978ac3dc062f0
      ? { rejectUnauthorized: false }
      : false,
  migrations: [__dirname + "/migrations/*.{ts,js}"],
  synchronize: false, // Always false for migrations
  logging: process.env.NODE_ENV === "development",
  ssl:
    isSupabase || process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
=======
  synchronize: false, // Always false for production
  logging: process.env.NODE_ENV === "development",
  ssl:
    process.env.NODE_ENV === "production"
>>>>>>> a169ee0935b3ca30a1b9c2fb30c978ac3dc062f0
      ? { rejectUnauthorized: false }
      : false,
});
