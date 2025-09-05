import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resume } from '../../database/entities/resume.entity';
import { AIProviderService } from '../../modules/ai/services/ai-provider.service';
import { QUEUE_NAMES } from '../queue.types';
import type { ResumeAnalysisJob } from '../queue.types';

@Injectable()
@Processor(QUEUE_NAMES.RESUME_ANALYSIS)
export class ResumeAnalysisProcessor {
  private readonly logger = new Logger(ResumeAnalysisProcessor.name);

  constructor(
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
    private aiProviderService: AIProviderService,
  ) {}

  @Process('analyze-resume')
  async handleResumeAnalysis(job: Job<ResumeAnalysisJob>) {
    const { resumeId, userId, provider } = job.data;
    
    this.logger.log(`Starting resume analysis for resume ${resumeId} by user ${userId}`);

    try {
      // Update job progress
      await job.progress(10);

      // Get resume from database
      const resume = await this.resumeRepository.findOne({ 
        where: { id: resumeId, userId } 
      });

      if (!resume) {
        throw new Error(`Resume ${resumeId} not found for user ${userId}`);
      }

      await job.progress(20);

      // Perform AI analysis
      const analysisResult = await this.aiProviderService.analyzeResume({
        content: resume.content,
        fileName: resume.fileName,
        provider,
      });

      await job.progress(60);

      // Extract key metrics
      const atsScore = this.calculateATSScore(analysisResult);
      const suggestions = this.extractSuggestions(analysisResult);
      const skills = this.extractSkills(analysisResult);
      const keywords = this.extractKeywords(analysisResult);

      await job.progress(80);

      // Update resume with analysis results
      await this.resumeRepository.update(resumeId, {
        atsScore,
        suggestions: suggestions.slice(0, 10) as any, // Limit to top 10 suggestions
        isProcessed: true,
        parsedContent: {
          ...resume.parsedContent,
          analysisResults: {
            ...analysisResult,
            skills,
            keywords,
            processedAt: new Date().toISOString(),
            provider,
          },
        },
      });

      await job.progress(100);

      this.logger.log(`Resume analysis completed for resume ${resumeId}`);

      return {
        resumeId,
        atsScore,
        suggestionsCount: suggestions.length,
        skillsCount: skills.length,
        status: 'completed',
      };

    } catch (error: any) {
      this.logger.error(`Resume analysis failed for resume ${resumeId}`, error);

      // Get resume again for error handling
      const resumeForError = await this.resumeRepository.findOne({ 
        where: { id: resumeId, userId } 
      });

      // Update resume status to error
      await this.resumeRepository.update(resumeId, {
        isProcessed: false,
        parsedContent: {
          ...resumeForError?.parsedContent,
          error: {
            message: error?.message || 'Analysis failed',
            timestamp: new Date().toISOString(),
            provider,
          },
        },
      });

      throw error;
    }
  }

  private calculateATSScore(analysisResult: any): number {
    try {
      // Extract ATS score from AI response
      const scoreMatch = analysisResult.text?.match(/ATS.*?(\d+)%?/i) || 
                        analysisResult.text?.match(/score.*?(\d+)%?/i);
      
      if (scoreMatch && scoreMatch[1]) {
        const score = parseInt(scoreMatch[1], 10);
        return Math.min(Math.max(score, 0), 100); // Ensure score is between 0-100
      }

      // Fallback calculation based on analysis quality
      let score = 50; // Base score

      // Check for common resume elements
      const content = analysisResult.text?.toLowerCase() || '';
      
      if (content.includes('contact') || content.includes('email') || content.includes('phone')) score += 10;
      if (content.includes('experience') || content.includes('work')) score += 15;
      if (content.includes('education') || content.includes('degree')) score += 10;
      if (content.includes('skills') || content.includes('technical')) score += 10;
      if (content.includes('achievement') || content.includes('accomplishment')) score += 5;

      return Math.min(score, 100);
    } catch (error) {
      this.logger.warn('Failed to calculate ATS score, using default');
      return 65; // Default score
    }
  }

  private extractSuggestions(analysisResult: any): Array<{
    type: 'content' | 'formatting' | 'keywords' | 'structure';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    example?: string;
  }> {
    try {
      const suggestions = [];
      const content = analysisResult.text || '';

      // Parse AI suggestions or create default ones
      if (content.includes('improve') || content.includes('add') || content.includes('consider')) {
        // Try to extract structured suggestions from AI response
        const suggestionMatches = content.match(/suggestion[s]?:?\s*(.+?)(?:\n|$)/gi);
        
        if (suggestionMatches) {
          suggestionMatches.forEach((match: string, index: number) => {
            suggestions.push({
              type: this.determineSuggestionType(match),
              priority: index < 3 ? 'high' : index < 6 ? 'medium' : 'low',
              title: `Improvement ${index + 1}`,
              description: match.replace(/suggestion[s]?:?\s*/i, '').trim(),
            });
          });
        }
      }

      // Add default suggestions if none found
      if (suggestions.length === 0) {
        suggestions.push(
          {
            type: 'keywords' as const,
            priority: 'high' as const,
            title: 'Optimize Keywords',
            description: 'Include more industry-relevant keywords to improve ATS compatibility',
          },
          {
            type: 'content' as const,
            priority: 'medium' as const,
            title: 'Quantify Achievements',
            description: 'Add specific numbers and metrics to demonstrate impact',
          },
          {
            type: 'structure' as const,
            priority: 'medium' as const,
            title: 'Improve Structure',
            description: 'Organize sections with clear headings and consistent formatting',
          }
        );
      }

      return suggestions;
    } catch (error) {
      this.logger.warn('Failed to extract suggestions, using defaults');
      return [
        {
          type: 'content' as const,
          priority: 'high' as const,
          title: 'Review Content',
          description: 'Consider reviewing and updating your resume content',
        }
      ];
    }
  }

  private determineSuggestionType(suggestion: string): 'content' | 'formatting' | 'keywords' | 'structure' {
    const lowerSuggestion = suggestion.toLowerCase();
    
    if (lowerSuggestion.includes('format') || lowerSuggestion.includes('font') || lowerSuggestion.includes('spacing')) {
      return 'formatting';
    }
    if (lowerSuggestion.includes('keyword') || lowerSuggestion.includes('term') || lowerSuggestion.includes('phrase')) {
      return 'keywords';
    }
    if (lowerSuggestion.includes('section') || lowerSuggestion.includes('order') || lowerSuggestion.includes('organize')) {
      return 'structure';
    }
    return 'content';
  }

  private extractSkills(analysisResult: any): string[] {
    try {
      const content = analysisResult.text || '';
      const skills = [];

      // Common technical skills patterns
      const skillPatterns = [
        /(?:JavaScript|TypeScript|Python|Java|C\+\+|React|Angular|Vue|Node\.js|Express|Django|Flask)/gi,
        /(?:SQL|PostgreSQL|MySQL|MongoDB|Redis|GraphQL)/gi,
        /(?:AWS|Azure|Docker|Kubernetes|Jenkins|Git)/gi,
        /(?:HTML|CSS|SASS|Bootstrap|Tailwind)/gi,
      ];

      for (const pattern of skillPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          skills.push(...matches.map((skill: string) => skill.trim()));
        }
      }

      // Remove duplicates and return unique skills
      return [...new Set(skills)];
    } catch (error) {
      this.logger.warn('Failed to extract skills');
      return [];
    }
  }

  private extractKeywords(analysisResult: any): string[] {
    try {
      const content = analysisResult.text || '';
      
      // Extract important keywords from content
      const words = content.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((word: string) => word.length > 3)
        .filter((word: string) => !this.isCommonWord(word));

      // Count frequency and return top keywords
      const wordCount: Record<string, number> = {};
      words.forEach((word: string) => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });

      return Object.entries(wordCount)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 20)
        .map(([word]) => word);
    } catch (error) {
      this.logger.warn('Failed to extract keywords');
      return [];
    }
  }

  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'use', 'your', 'work', 'life', 'them', 'well', 'were'
    ]);
    return commonWords.has(word.toLowerCase());
  }
}