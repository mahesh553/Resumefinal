import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { AIProviderService } from './services/ai-provider.service';
import Redis from 'ioredis';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        });
      },
      inject: [ConfigService],
    },
    GeminiProvider,
    OpenAIProvider,
    ClaudeProvider,
    {
      provide: AIProviderService,
      useFactory: (
        configService: ConfigService,
        redis: Redis,
        geminiProvider: GeminiProvider,
        openaiProvider: OpenAIProvider,
        claudeProvider: ClaudeProvider,
      ) => {
        return new AIProviderService(
          configService,
          redis,
          geminiProvider,
          openaiProvider,
          claudeProvider,
        );
      },
      inject: [ConfigService, 'REDIS', GeminiProvider, OpenAIProvider, ClaudeProvider],
    },
  ],
  exports: [AIProviderService],
})
export class AIModule {}