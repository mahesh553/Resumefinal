import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AIProvider,
  ResumeAnalysisResult,
  JDMatchResult,
  SkillCategory,
  SkillLevel,
  AIAnalysisOptions,
  AISuggestionOptions,
  AIMatchingOptions,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class OpenAIProvider implements AIProvider {
  name = 'openai';
  isHealthy = true;
  priority = 2; // Secondary provider
  costPerToken = 0.002; // GPT-4 pricing per 1K tokens

  private readonly logger = new Logger(OpenAIProvider.name);
  private client: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured');
      this.isHealthy = false;
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey: apiKey,
      });
      this.logger.log('OpenAI provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI provider', error);
      this.isHealthy = false;
    }
  }

  async analyze(text: string, options?: AIAnalysisOptions): Promise<ResumeAnalysisResult> {
    const startTime = Date.now();

    try {
      const prompt = this.buildAnalysisPrompt(text, options);
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume analyzer. Provide detailed, accurate analysis in the exact JSON format requested.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const analysis = this.parseAnalysisResponse(response);
      analysis.processingTime = Date.now() - startTime;
      
      this.logger.log(`Resume analysis completed in ${analysis.processingTime}ms`);
      return analysis;

    } catch (error: any) {
      this.logger.error('OpenAI analysis failed', error);
      this.isHealthy = false;
      throw new Error(`OpenAI analysis failed: ${error?.message || 'Unknown error'}`);
    }
  }

  async generateSuggestions(resumeText: string, jobDescription?: string, options?: AISuggestionOptions): Promise<string[]> {
    try {
      const prompt = this.buildSuggestionPrompt(resumeText, jobDescription, options);
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a career coach specializing in resume optimization. Provide actionable, specific suggestions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return this.parseSuggestionsResponse(response);

    } catch (error: any) {
      this.logger.error('OpenAI suggestion generation failed', error);
      throw new Error(`OpenAI suggestion generation failed: ${error?.message || 'Unknown error'}`);
    }
  }

  async matchJobDescription(resumeText: string, jobDescription: string, options?: AIMatchingOptions): Promise<JDMatchResult> {
    try {
      const prompt = this.buildMatchingPrompt(resumeText, jobDescription, options);
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing job-resume compatibility. Provide detailed matching analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return this.parseMatchingResponse(response);

    } catch (error: any) {
      this.logger.error('OpenAI JD matching failed', error);
      throw new Error(`OpenAI JD matching failed: ${error?.message || 'Unknown error'}`);
    }
  }

  private buildAnalysisPrompt(resumeText: string, _options?: any): string {
    return `
Analyze this resume and provide comprehensive analysis in strict JSON format:

RESUME:
${resumeText}

Return ONLY valid JSON in this exact structure:
{
  "atsScore": <number 0-100>,
  "skills": [
    {
      "name": "<skill name>",
      "category": "<technical|soft|language|certification|tool|framework>",
      "confidence": <number 0-1>,
      "yearsExperience": <number or null>,
      "level": "<beginner|intermediate|advanced|expert>"
    }
  ],
  "suggestions": ["<actionable suggestion>"],
  "personalInfo": {
    "name": "<name or null>",
    "email": "<email or null>",
    "phone": "<phone or null>",
    "location": "<location or null>",
    "linkedin": "<linkedin or null>",
    "github": "<github or null>"
  },
  "experience": [
    {
      "company": "<company>",
      "position": "<title>",
      "startDate": "<date>",
      "endDate": "<date or null>",
      "description": "<description>",
      "achievements": ["<achievement>"],
      "skills": ["<skill>"]
    }
  ],
  "education": [
    {
      "institution": "<school>",
      "degree": "<degree>",
      "field": "<field>",
      "startDate": "<date>",
      "endDate": "<date>",
      "gpa": "<gpa or null>",
      "achievements": ["<achievement>"]
    }
  ],
  "summary": "<professional summary>",
  "confidence": <number 0-1>
}
`;
  }

  private buildSuggestionPrompt(resumeText: string, jobDescription?: string, _options?: any): string {
    let prompt = `Generate 5-8 specific resume improvement suggestions for this resume:\n\n${resumeText}`;
    
    if (jobDescription) {
      prompt += `\n\nTarget Job:\n${jobDescription}\n\nFocus on aligning with this job.`;
    }
    
    prompt += `\n\nReturn as JSON array: ["suggestion 1", "suggestion 2", ...]`;
    return prompt;
  }

  private buildMatchingPrompt(resumeText: string, jobDescription: string, _options?: any): string {
    return `
Analyze resume-job match:

RESUME:
${resumeText}

JOB:
${jobDescription}

Return JSON:
{
  "overallScore": <0-100>,
  "skillMatches": [
    {
      "skill": "<skill>",
      "resumeStrength": <0-100>,
      "jdRequirement": <0-100>,
      "isMatch": <boolean>,
      "gap": <0-100 or null>
    }
  ],
  "missingSkills": ["<skill>"],
  "strengthAreas": ["<area>"],
  "improvementAreas": ["<area>"],
  "recommendations": ["<recommendation>"],
  "confidence": <0-1>
}
`;
  }

  private parseAnalysisResponse(response: string): ResumeAnalysisResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        atsScore: Math.min(100, Math.max(0, parsed.atsScore || 0)),
        skills: Array.isArray(parsed.skills) ? parsed.skills.map((skill: any) => ({
          name: skill.name || '',
          category: skill.category || SkillCategory.TECHNICAL,
          confidence: Math.min(1, Math.max(0, skill.confidence || 0.5)),
          yearsExperience: skill.yearsExperience || undefined,
          level: skill.level || SkillLevel.INTERMEDIATE,
        })) : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        personalInfo: parsed.personalInfo || {},
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        education: Array.isArray(parsed.education) ? parsed.education : [],
        summary: parsed.summary || '',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
        processingTime: 0,
      };
    } catch (error: any) {
      this.logger.error('Failed to parse OpenAI response', error);
      throw new Error(`Invalid response format: ${error?.message || 'Parse error'}`);
    }
  }

  private parseSuggestionsResponse(response: string): string[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return response
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 10)
          .slice(0, 8);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
    } catch (error) {
      this.logger.error('Failed to parse suggestions response', error);
      return ['Unable to generate suggestions at this time'];
    }
  }

  private parseMatchingResponse(response: string): JDMatchResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        overallScore: Math.min(100, Math.max(0, parsed.overallScore || 0)),
        skillMatches: Array.isArray(parsed.skillMatches) ? parsed.skillMatches : [],
        missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
        strengthAreas: Array.isArray(parsed.strengthAreas) ? parsed.strengthAreas : [],
        improvementAreas: Array.isArray(parsed.improvementAreas) ? parsed.improvementAreas : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      };
    } catch (error: any) {
      this.logger.error('Failed to parse matching response', error);
      throw new Error(`Invalid response format: ${error?.message || 'Parse error'}`);
    }
  }
}