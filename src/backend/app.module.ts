import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';
import { ResumeAnalysisModule } from './modules/resume-analysis/resume-analysis.module';
import { JobTrackerModule } from './modules/job-tracker/job-tracker.module';
import { JdMatchingModule } from './modules/jd-matching/jd-matching.module';
import { ResumeVersionsModule } from './modules/resume-versions/resume-versions.module';
import { AdminModule } from './modules/admin/admin.module';
import { QueueProcessorModule } from './queues/queue-processor.module';
import * as entities from './database/entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: Object.values(entities),
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    
    // Redis/BullMQ configuration
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    
    // Application modules
    AuthModule,
    ResumeAnalysisModule,
    JobTrackerModule,
    JdMatchingModule,
    ResumeVersionsModule,
    AdminModule,
    
    // Queue processing
    QueueProcessorModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}