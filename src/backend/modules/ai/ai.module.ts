import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { RedisService } from "../../config/redis.service";
import { ClaudeProvider } from "./providers/claude.provider";
import { GeminiProvider } from "./providers/gemini.provider";
import { OpenAIProvider } from "./providers/openai.provider";
import { AIProviderService } from "./services/ai-provider.service";

@Module({
  imports: [ConfigModule],
  providers: [
    RedisService,
    GeminiProvider,
    OpenAIProvider,
    ClaudeProvider,
    {
      provide: AIProviderService,
      useFactory: (
        configService: ConfigService,
        redisService: RedisService,
        geminiProvider: GeminiProvider,
        openaiProvider: OpenAIProvider,
        claudeProvider: ClaudeProvider
      ) => {
        return new AIProviderService(
          configService,
          redisService,
          geminiProvider,
          openaiProvider,
          claudeProvider
        );
      },
      inject: [
        ConfigService,
        RedisService,
        GeminiProvider,
        OpenAIProvider,
        ClaudeProvider,
      ],
    },
  ],
  exports: [AIProviderService, RedisService],
})
export class AIModule {}
