import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JdMatching } from '../../database/entities/jd-matching.entity';
import { Resume } from '../../database/entities/resume.entity';
import { AIProviderService } from '../../modules/ai/services/ai-provider.service';
import { QUEUE_NAMES } from '../queue.types';
import type { JDMatchingJob } from '../queue.types';

@Injectable()
@Processor(QUEUE_NAMES.JD_MATCHING)
export class JDMatchingProcessor {
  private readonly logger = new Logger(JDMatchingProcessor.name);

  constructor(
    @InjectRepository(JdMatching)
    private jdMatchingRepository: Repository<JdMatching>,
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
    private aiProviderService: AIProviderService,
  ) {}

  @Process('match-jd')
  async handleJDMatching(job: Job<JDMatchingJob>) {
    const { analysisId, resumeContent, jobDescription, userId, useSemanticMatching = true } = job.data;
    
    this.logger.log(`Starting JD matching for analysis ${analysisId}`);

    try {
      await job.progress(10);

      // Perform keyword-based matching
      const keywordMatching = this.performKeywordMatching(resumeContent, jobDescription);
      
      await job.progress(30);

      let semanticMatching = null;
      let overallScore = keywordMatching.score;

      // Perform AI-powered semantic matching if enabled
      if (useSemanticMatching) {
        try {
          semanticMatching = await this.performSemanticMatching(resumeContent, jobDescription);
          overallScore = Math.round((keywordMatching.score + semanticMatching.score) / 2);
        } catch (error) {
          this.logger.warn('Semantic matching failed, using keyword matching only', error);
        }
      }

      await job.progress(70);

      // Generate improvement suggestions
      const suggestions = this.generateImprovementSuggestions(
        keywordMatching,
        semanticMatching,
        jobDescription
      );

      await job.progress(90);

      // Save matching results
      const matchingResult = this.jdMatchingRepository.create({
        id: analysisId,
        userId,
        resumeContent: resumeContent.substring(0, 5000), // Truncate for storage
        jobDescription: jobDescription.substring(0, 5000),
        overallScore,
        keywordMatching: keywordMatching,
        semanticMatching: semanticMatching,
        suggestions: suggestions.slice(0, 10), // Limit suggestions
        matchedKeywords: keywordMatching.matchedKeywords,
        missingKeywords: keywordMatching.missingKeywords,
        createdAt: new Date(),
      });

      await this.jdMatchingRepository.save(matchingResult);

      await job.progress(100);

      this.logger.log(`JD matching completed for analysis ${analysisId} with score ${overallScore}`);

      return {
        analysisId,
        overallScore,
        keywordScore: keywordMatching.score,
        semanticScore: semanticMatching?.score,
        matchedKeywords: keywordMatching.matchedKeywords.length,
        missingKeywords: keywordMatching.missingKeywords.length,
        suggestionsCount: suggestions.length,
        status: 'completed',
      };

    } catch (error: any) {
      this.logger.error(`JD matching failed for analysis ${analysisId}`, error);
      
      // Save error state
      await this.jdMatchingRepository.save({
        id: analysisId,
        userId,
        resumeContent: resumeContent.substring(0, 1000),
        jobDescription: jobDescription.substring(0, 1000),
        overallScore: 0,
        error: error?.message || 'Matching failed',
        createdAt: new Date(),
      });

      throw error;
    }
  }

  private performKeywordMatching(resumeContent: string, jobDescription: string) {
    const resumeWords = this.extractKeywords(resumeContent);
    const jobWords = this.extractKeywords(jobDescription);

    // Find matching keywords
    const matchedKeywords = resumeWords.filter(word => 
      jobWords.some(jobWord => this.isWordMatch(word, jobWord))
    );

    // Find missing important keywords
    const importantJobKeywords = this.extractImportantKeywords(jobDescription);
    const missingKeywords = importantJobKeywords.filter(keyword =>
      !resumeWords.some(resumeWord => this.isWordMatch(resumeWord, keyword))
    );

    // Calculate keyword matching score
    const score = Math.round(
      (matchedKeywords.length / Math.max(importantJobKeywords.length, 1)) * 100
    );

    return {
      score: Math.min(score, 100),
      matchedKeywords,
      missingKeywords,
      totalJobKeywords: importantJobKeywords.length,
      matchingMethod: 'keyword-based',
    };
  }

  private async performSemanticMatching(resumeContent: string, jobDescription: string) {
    try {
      const prompt = `
        Compare the following resume content with the job description and provide a semantic similarity score from 0-100:

        RESUME:
        ${resumeContent.substring(0, 2000)}

        JOB DESCRIPTION:
        ${jobDescription.substring(0, 2000)}

        Please analyze:
        1. Skill relevance and transferability
        2. Experience alignment
        3. Industry context matching
        4. Role requirements fulfillment

        Respond with just a number from 0-100 representing the semantic match score.
      `;

      const result = await this.aiProviderService.analyzeText({
        prompt,
        provider: 'gemini',
        maxTokens: 100,
      });

      // Extract score from AI response
      const scoreMatch = result.text?.match(/(\d+)/);
      const score = scoreMatch ? Math.min(Math.max(parseInt(scoreMatch[1]), 0), 100) : 50;

      return {
        score,
        analysis: result.text,
        matchingMethod: 'semantic-ai',
      };

    } catch (error) {
      this.logger.warn('Semantic matching failed', error);
      throw error;
    }
  }

  private extractKeywords(text: string): string[] {
    // Clean and normalize text
    const cleanText = text.toLowerCase()
      .replace(/[^\w\s\-.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract meaningful keywords (3+ characters, not common words)
    const words = cleanText.split(' ')
      .filter(word => word.length >= 3)
      .filter(word => !this.isCommonWord(word))
      .filter(word => this.isSkillOrTechnology(word));

    // Remove duplicates and return
    return [...new Set(words)];
  }

  private extractImportantKeywords(jobDescription: string): string[] {
    const keywords = this.extractKeywords(jobDescription);
    
    // Prioritize technical skills, certifications, and specific requirements
    const importantPatterns = [
      /(?:require[ds]?|must have|essential|mandatory|critical)/i,
      /(?:skill[s]?|experience|proficien[ct]|expert)/i,
      /(?:certification|certified|license)/i,
    ];

    const importantKeywords = [];
    const sentences = jobDescription.split(/[.!?]+/);

    for (const sentence of sentences) {
      const isImportant = importantPatterns.some(pattern => pattern.test(sentence));
      if (isImportant) {
        const sentenceKeywords = this.extractKeywords(sentence);
        importantKeywords.push(...sentenceKeywords);
      }
    }

    // Combine with general keywords and prioritize
    const allKeywords = [...new Set([...importantKeywords, ...keywords])];
    return allKeywords.slice(0, 50); // Limit to top 50 keywords
  }

  private isWordMatch(word1: string, word2: string): boolean {
    // Exact match
    if (word1 === word2) return true;
    
    // Partial match for compound words
    if (word1.includes(word2) || word2.includes(word1)) {
      return Math.min(word1.length, word2.length) >= 4;
    }
    
    // Similar technologies (could be expanded)
    const synonyms = {
      'javascript': ['js', 'javascript', 'ecmascript'],
      'typescript': ['ts', 'typescript'],
      'python': ['python', 'py'],
      'react': ['react', 'reactjs', 'react.js'],
      'angular': ['angular', 'angularjs'],
      'vue': ['vue', 'vuejs', 'vue.js'],
    };

    for (const [_key, values] of Object.entries(synonyms)) {
      if (values.includes(word1.toLowerCase()) && values.includes(word2.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  private isSkillOrTechnology(word: string): boolean {
    // Check if word looks like a technology, skill, or professional term
    const techPatterns = [
      /^[a-z]+\.[a-z]+$/i, // framework.js patterns
      /^[a-z]{2,}sql$/i, // SQL variants
      /^aws|azure|gcp$/i, // Cloud platforms
      /^[a-z]+\.?(js|py|php|rb)$/i, // Programming languages
    ];

    if (techPatterns.some(pattern => pattern.test(word))) return true;

    // Common tech/skill keywords
    const skillKeywords = new Set([
      'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node', 'express',
      'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'docker', 'kubernetes',
      'aws', 'azure', 'git', 'jenkins', 'ci/cd', 'agile', 'scrum', 'devops',
      'html', 'css', 'sass', 'bootstrap', 'tailwind', 'webpack', 'babel',
      'typescript', 'graphql', 'rest', 'api', 'microservices', 'cloud'
    ]);

    return skillKeywords.has(word.toLowerCase());
  }

  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
      'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who',
      'boy', 'did', 'use', 'your', 'work', 'life', 'them', 'well', 'were',
      'will', 'with', 'have', 'this', 'that', 'from', 'they', 'know', 'want',
      'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here',
      'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than',
      'only', 'think', 'also', 'back', 'after', 'first', 'well', 'year'
    ]);
    
    return commonWords.has(word.toLowerCase());
  }

  private generateImprovementSuggestions(keywordMatching: any, semanticMatching: any, _jobDescription: string) {
    const suggestions = [];

    // Keyword-based suggestions
    if (keywordMatching.missingKeywords.length > 0) {
      const topMissing = keywordMatching.missingKeywords.slice(0, 5);
      suggestions.push({
        type: 'keywords' as const,
        priority: 'high' as const,
        title: 'Add Missing Keywords',
        description: `Include these important keywords: ${topMissing.join(', ')}`,
        keywords: topMissing,
      });
    }

    // Score-based suggestions
    if (keywordMatching.score < 50) {
      suggestions.push({
        type: 'content' as const,
        priority: 'high' as const,
        title: 'Improve Keyword Alignment',
        description: 'Your resume matches less than 50% of the job requirements. Consider adding more relevant skills and experience.',
      });
    }

    if (semanticMatching && semanticMatching.score < 60) {
      suggestions.push({
        type: 'content' as const,
        priority: 'medium' as const,
        title: 'Enhance Experience Relevance',
        description: 'Highlight experiences that more closely align with the role requirements.',
      });
    }

    // General improvement suggestions
    suggestions.push({
      type: 'structure' as const,
      priority: 'medium' as const,
      title: 'Tailor Resume Section',
      description: 'Create a dedicated skills section highlighting technologies mentioned in the job posting.',
    });

    return suggestions;
  }
}