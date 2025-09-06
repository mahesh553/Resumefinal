import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as entities from './entities';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: configService.get('DATABASE_URL'),
  host: configService.get('DATABASE_HOST') || 'localhost',
  port: configService.get('DATABASE_PORT') || 5432,
  username: configService.get('DATABASE_USERNAME') || 'postgres',
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME') || 'qoder_resume',
  entities: Object.values(entities),
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false, // Always false for production
  logging: configService.get('NODE_ENV') === 'development',
  ssl: configService.get('NODE_ENV') === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
});