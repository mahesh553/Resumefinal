import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../config/redis.service';
import { GeminiProvider } from '../providers/gemini.provider';
import { OpenAIProvider } from '../providers/openai.provider';
import { ClaudeProvider } from '../providers/claude.provider';
import {
  AIProvider,
  ResumeAnalysisResult,
  JDMatchResult,
} from '../interfaces/ai-provider.interface';
import * as crypto from 'crypto';

@Injectable()
export class AIProviderService {
  private readonly logger = new Logger(AIProviderService.name);
  private providers: AIProvider[] = [];
  private cacheEnabled: boolean;
  private cacheTTL: number;

  constructor(
    private configService: ConfigService,
    private redis: RedisService,
    private geminiProvider: GeminiProvider,
    private openaiProvider: OpenAIProvider,
    private claudeProvider: ClaudeProvider,
  ) {
    this.cacheEnabled = this.configService.get('AI_CACHE_ENABLED', 'true') === 'true';
    this.cacheTTL = parseInt(this.configService.get('AI_CACHE_TTL', '86400')); // 24 hours

    // Initialize providers in priority order (Gemini -> OpenAI -> Claude)
    this.providers = [
      this.geminiProvider,
      this.openaiProvider,
      this.claudeProvider,
    ].sort((a, b) => a.priority - b.priority);

    this.logger.log(`Initialized ${this.providers.length} AI providers`);
    this.logProviderStatus();
  }

  async analyzeResume(options: { content: string; fileName: string; provider?: string }): Promise<ResumeAnalysisResult> {
    const { content, fileName, provider } = options;
    const cacheKey = this.generateCacheKey('analysis', content, { fileName, provider });
    
    // Try cache first
    if (this.cacheEnabled) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached analysis result');
        return cached;
      }
    }

    // Use specific provider if requested, otherwise use all in priority order
    const providers = provider ? 
      this.providers.filter(p => p.name.toLowerCase() === provider.toLowerCase()) :
      this.getHealthyProviders();

    // Try providers in order of priority
    for (const prov of providers) {
      try {
        this.logger.log(`Attempting analysis with ${prov.name}`);
        const result = await prov.analyze(content, { fileName });
        
        // Cache successful result
        if (this.cacheEnabled) {
          await this.setCache(cacheKey, result);
        }

        // Track usage for cost optimization
        await this.trackUsage(prov.name, 'analysis', this.estimateTokens(content), prov.costPerToken);
        
        return result;

      } catch (error: any) {
        this.logger.warn(`${prov.name} analysis failed: ${error?.message || 'Unknown error'}`);
        prov.isHealthy = false;
        
        // Continue to next provider
        continue;
      }
    }

    throw new Error('All AI providers failed for resume analysis');
  }

  async analyzeText(options: { prompt: string; provider?: string; maxTokens?: number }): Promise<{ text: string }> {
    const { prompt, provider, maxTokens } = options;
    const cacheKey = this.generateCacheKey('text-analysis', prompt, { provider, maxTokens });
    
    // Try cache first
    if (this.cacheEnabled) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached text analysis result');
        return cached;
      }
    }

    // Use specific provider if requested, otherwise use all in priority order
    const providers = provider ? 
      this.providers.filter(p => p.name.toLowerCase() === provider.toLowerCase()) :
      this.getHealthyProviders();

    // Try providers in order of priority
    for (const prov of providers) {
      try {
        this.logger.log(`Attempting text analysis with ${prov.name}`);
        
        // For simple text analysis, we'll use the analyze method with appropriate options
        const result = await prov.analyze(prompt, { maxTokens, mode: 'text' });
        
        // Cache successful result
        if (this.cacheEnabled) {
          await this.setCache(cacheKey, result);
        }

        // Track usage
        await this.trackUsage(prov.name, 'text-analysis', this.estimateTokens(prompt), prov.costPerToken);
        
        return { text: result.suggestions?.[0] || result.text || 'Analysis completed' };

      } catch (error: any) {
        this.logger.warn(`${prov.name} text analysis failed: ${error?.message || 'Unknown error'}`);
        prov.isHealthy = false;
        continue;
      }
    }

    throw new Error('All AI providers failed for text analysis');
  }

  async generateSuggestions(resumeText: string, jobDescription?: string, options?: any): Promise<string[]> {
    const cacheKey = this.generateCacheKey('suggestions', resumeText + (jobDescription || ''), options);
    
    // Try cache first
    if (this.cacheEnabled) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached suggestions');
        return cached;
      }
    }

    // Try providers in order of priority
    for (const provider of this.getHealthyProviders()) {
      try {
        this.logger.log(`Generating suggestions with ${provider.name}`);
        const result = await provider.generateSuggestions(resumeText, jobDescription, options);
        
        // Cache successful result
        if (this.cacheEnabled) {
          await this.setCache(cacheKey, result);
        }

        // Track usage
        const totalText = resumeText + (jobDescription || '');
        await this.trackUsage(provider.name, 'suggestions', this.estimateTokens(totalText), provider.costPerToken);
        
        return result;

      } catch (error: any) {
        this.logger.warn(`${provider.name} suggestions failed: ${error?.message || 'Unknown error'}`);
        provider.isHealthy = false;
        continue;
      }
    }

    throw new Error('All AI providers failed for suggestion generation');
  }

  async matchJobDescription(resumeText: string, jobDescription: string, options?: any): Promise<JDMatchResult> {
    const cacheKey = this.generateCacheKey('matching', resumeText + jobDescription, options);
    
    // Try cache first
    if (this.cacheEnabled) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached matching result');
        return cached;
      }
    }

    // Try providers in order of priority
    for (const provider of this.getHealthyProviders()) {
      try {
        this.logger.log(`Job matching with ${provider.name}`);
        const result = await provider.matchJobDescription(resumeText, jobDescription, options);
        
        // Cache successful result
        if (this.cacheEnabled) {
          await this.setCache(cacheKey, result);
        }

        // Track usage
        const totalText = resumeText + jobDescription;
        await this.trackUsage(provider.name, 'matching', this.estimateTokens(totalText), provider.costPerToken);
        
        return result;

      } catch (error: any) {
        this.logger.warn(`${provider.name} matching failed: ${error?.message || 'Unknown error'}`);
        provider.isHealthy = false;
        continue;
      }
    }

    throw new Error('All AI providers failed for job description matching');
  }

  async getProviderHealth(): Promise<Record<string, any>> {
    const healthStatus: Record<string, any> = {};
    
    for (const provider of this.providers) {
      healthStatus[provider.name] = {
        isHealthy: provider.isHealthy,
        priority: provider.priority,
        costPerToken: provider.costPerToken,
        lastCheck: new Date(),
      };
    }

    return healthStatus;
  }

  async resetProviderHealth(): Promise<void> {
    this.logger.log('Resetting all provider health status');
    
    for (const provider of this.providers) {
      provider.isHealthy = true;
    }
  }

  private getHealthyProviders(): AIProvider[] {
    const healthy = this.providers.filter(p => p.isHealthy);
    
    if (healthy.length === 0) {
      this.logger.warn('No healthy providers available, resetting health status');
      this.resetProviderHealth();
      return this.providers;
    }
    
    return healthy;
  }

  private generateCacheKey(operation: string, text: string, options?: any): string {
    const content = text + JSON.stringify(options || {});
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `ai:${operation}:${hash}`;
  }

  private async getFromCache(key: string): Promise<any> {
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error('Cache retrieval failed', error);
      return null;
    }
  }

  private async setCache(key: string, data: any): Promise<void> {
    try {
      await this.redis.setex(key, this.cacheTTL, JSON.stringify(data));
    } catch (error) {
      this.logger.error('Cache storage failed', error);
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private async trackUsage(provider: string, operation: string, tokens: number, costPerToken: number): Promise<void> {
    try {
      const cost = (tokens / 1000) * costPerToken;
      const date = new Date().toISOString().split('T')[0];
      const usageKey = `ai:usage:${provider}:${date}`;
      
      await this.redis.hincrby(usageKey, 'tokens', tokens);
      await this.redis.hincrbyfloat(usageKey, 'cost', cost);
      await this.redis.hincrby(usageKey, operation, 1);
      await this.redis.expire(usageKey, 30 * 24 * 60 * 60); // 30 days
      
    } catch (error) {
      this.logger.error('Usage tracking failed', error);
    }
  }

  private logProviderStatus(): void {
    this.logger.log('AI Provider Status:');
    for (const provider of this.providers) {
      this.logger.log(`  ${provider.name}: ${provider.isHealthy ? '✓' : '✗'} (Priority: ${provider.priority}, Cost: $${provider.costPerToken}/1k)`);
    }
  }

  async getCostAnalytics(startDate?: Date, endDate?: Date): Promise<Record<string, any>> {
    try {
      const analytics: Record<string, any> = {};
      const now = new Date();
      const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate || now;

      for (const provider of this.providers) {
        const costs = [];
        let current = new Date(start);
        
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          const usageKey = `ai:usage:${provider.name}:${dateStr}`;
          const usage = await this.redis.hgetall(usageKey);
          
          costs.push({
            date: dateStr,
            tokens: parseInt(usage.tokens || '0'),
            cost: parseFloat(usage.cost || '0'),
            operations: {
              analysis: parseInt(usage.analysis || '0'),
              suggestions: parseInt(usage.suggestions || '0'),
              matching: parseInt(usage.matching || '0'),
            },
          });
          
          current.setDate(current.getDate() + 1);
        }
        
        analytics[provider.name] = costs;
      }

      return analytics;
    } catch (error) {
      this.logger.error('Failed to get cost analytics', error);
      return {};
    }
  }
}