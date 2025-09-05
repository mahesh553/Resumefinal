import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIProvider,
  ResumeAnalysisResult,
  JDMatchResult,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class ClaudeProvider implements AIProvider {
  name = 'claude';
  isHealthy = false; // Disabled until proper SDK integration
  priority = 3; // Tertiary provider
  costPerToken = 0.003; // Claude pricing per 1K tokens

  private readonly logger = new Logger(ClaudeProvider.name);

  constructor(private configService: ConfigService) {
    this.logger.warn('Claude provider temporarily disabled - API integration pending');
  }

  async analyze(_text: string, _options?: any): Promise<ResumeAnalysisResult> {
    throw new Error('Claude provider temporarily disabled - API integration pending');
  }

  async generateSuggestions(_resumeText: string, _jobDescription?: string, _options?: any): Promise<string[]> {
    throw new Error('Claude provider temporarily disabled - API integration pending');
  }

  async matchJobDescription(_resumeText: string, _jobDescription: string, _options?: any): Promise<JDMatchResult> {
    throw new Error('Claude provider temporarily disabled - API integration pending');
  }
}