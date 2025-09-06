import { GoogleGenerativeAI } from "@google/generative-ai";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AIAnalysisOptions,
  AIMatchingOptions,
  AIProvider,
  AISuggestionOptions,
  Education,
  JDMatchResult,
  ResumeAnalysisResult,
  SkillCategory,
  SkillLevel,
  SkillMatch,
  WorkExperience,
} from "../interfaces/ai-provider.interface";

@Injectable()
export class GeminiProvider implements AIProvider {
  name = "gemini";
  isHealthy = true;
  priority = 1; // Highest priority as primary provider
  costPerToken = 0.000125; // Gemini Pro pricing per 1K tokens

  private readonly logger = new Logger(GeminiProvider.name);
  private client: GoogleGenerativeAI;
  private model: import("@google/generative-ai").GenerativeModel;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get("GEMINI_API_KEY");
    if (!apiKey) {
      this.logger.warn("Gemini API key not configured");
      this.isHealthy = false;
      return;
    }

    try {
      this.client = new GoogleGenerativeAI(apiKey);
      // Try using the latest model based on API example
      this.model = this.client.getGenerativeModel({
        model: "gemini-2.0-flash",
      });
      this.logger.log(
        "Gemini provider initialized successfully with gemini-2.0-flash"
      );
    } catch (error) {
      this.logger.error("Failed to initialize Gemini provider", error);
      this.isHealthy = false;
    }
  }

  async analyze(
    text: string,
    options?: AIAnalysisOptions
  ): Promise<ResumeAnalysisResult> {
    const startTime = Date.now();

    try {
      const prompt = this.buildAnalysisPrompt(text, options);
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const analysisText = response.text();

      const analysis = this.parseAnalysisResponse(analysisText);
      analysis.processingTime = Date.now() - startTime;

      this.logger.log(
        `Resume analysis completed in ${analysis.processingTime}ms`
      );
      return analysis;
    } catch (error: unknown) {
      this.logger.error("Gemini analysis failed", error);
      this.isHealthy = false;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Gemini analysis failed: ${errorMessage}`);
    }
  }

  async generateSuggestions(
    resumeText: string,
    jobDescription?: string,
    options?: AISuggestionOptions
  ): Promise<string[]> {
    try {
      const prompt = this.buildSuggestionPrompt(
        resumeText,
        jobDescription,
        options
      );
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const suggestionsText = response.text();

      return this.parseSuggestionsResponse(suggestionsText);
    } catch (error: unknown) {
      this.logger.error("Gemini suggestion generation failed", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Gemini suggestion generation failed: ${errorMessage}`);
    }
  }

  async matchJobDescription(
    resumeText: string,
    jobDescription: string,
    options?: AIMatchingOptions
  ): Promise<JDMatchResult> {
    try {
      const prompt = this.buildMatchingPrompt(
        resumeText,
        jobDescription,
        options
      );
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const matchText = response.text();

      return this.parseMatchingResponse(matchText);
    } catch (error: unknown) {
      this.logger.error("Gemini JD matching failed", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Gemini JD matching failed: ${errorMessage}`);
    }
  }

  private buildAnalysisPrompt(
    resumeText: string,
    _options?: AIAnalysisOptions
  ): string {
    return `
Analyze the following resume and provide a comprehensive analysis in JSON format:

RESUME TEXT:
${resumeText}

Please provide analysis in the following JSON structure:
{
  "atsScore": (number 0-100),
  "skills": [
    {
      "name": "skill name",
      "category": "technical|soft|language|certification|tool|framework",
      "confidence": (number 0-1),
      "yearsExperience": (number or null),
      "level": "beginner|intermediate|advanced|expert"
    }
  ],
  "suggestions": [
    "specific actionable suggestions for improvement"
  ],
  "personalInfo": {
    "name": "extracted name or null",
    "email": "extracted email or null",
    "phone": "extracted phone or null",
    "location": "extracted location or null",
    "linkedin": "extracted linkedin or null",
    "github": "extracted github or null"
  },
  "experience": [
    {
      "company": "company name",
      "position": "job title",
      "startDate": "date string",
      "endDate": "date string or null for current",
      "description": "job description",
      "achievements": ["list of achievements"],
      "skills": ["skills used in this role"]
    }
  ],
  "education": [
    {
      "institution": "school name",
      "degree": "degree type",
      "field": "field of study",
      "startDate": "date string",
      "endDate": "date string",
      "gpa": "gpa or null",
      "achievements": ["academic achievements"]
    }
  ],
  "summary": "brief professional summary",
  "confidence": (number 0-1 indicating analysis confidence)
}

Focus on:
1. ATS compatibility (formatting, keywords, sections)
2. Skill extraction with confidence levels
3. Professional experience parsing
4. Education background
5. Contact information extraction
6. Actionable improvement suggestions
`;
  }

  private buildSuggestionPrompt(
    resumeText: string,
    jobDescription?: string,
    _options?: AISuggestionOptions
  ): string {
    let prompt = `
Generate specific, actionable resume improvement suggestions based on the following resume:

RESUME TEXT:
${resumeText}
`;

    if (jobDescription) {
      prompt += `
JOB DESCRIPTION:
${jobDescription}

Focus suggestions on aligning the resume with this specific job description.
`;
    }

    prompt += `
Provide 5-8 specific, actionable suggestions in JSON array format:
[
  "suggestion 1",
  "suggestion 2",
  ...
]

Each suggestion should:
- Be specific and actionable
- Include quantifiable improvements where possible
- Address ATS optimization
- Focus on impact and achievements
- Suggest relevant keywords or skills to add
${jobDescription ? "- Align with the target job requirements" : ""}
`;

    return prompt;
  }

  private buildMatchingPrompt(
    resumeText: string,
    jobDescription: string,
    _options?: AIMatchingOptions
  ): string {
    return `
Analyze how well this resume matches the job description:

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Provide analysis in JSON format:
{
  "overallScore": (number 0-100),
  "skillMatches": [
    {
      "skill": "skill name",
      "resumeStrength": (number 0-100),
      "jdRequirement": (number 0-100),
      "isMatch": (boolean),
      "gap": (number 0-100 if not match)
    }
  ],
  "missingSkills": ["skills mentioned in JD but missing from resume"],
  "strengthAreas": ["areas where resume strongly matches JD"],
  "improvementAreas": ["areas needing improvement for better match"],
  "recommendations": ["specific recommendations to improve match"],
  "confidence": (number 0-1)
}

Focus on:
1. Technical skills alignment
2. Experience relevance
3. Education requirements
4. Soft skills match
5. Industry keywords
6. Seniority level alignment
`;
  }

  private parseAnalysisResponse(response: string): ResumeAnalysisResult {
    try {
      // Extract JSON from response (in case there's additional text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        atsScore?: number;
        skills?: Array<{
          name?: string;
          category?: string;
          confidence?: number;
          yearsExperience?: number;
          level?: string;
        }>;
        suggestions?: string[];
        personalInfo?: Record<string, unknown>;
        experience?: unknown[];
        education?: unknown[];
        summary?: string;
        confidence?: number;
      };

      // Validate and set defaults
      return {
        atsScore: Math.min(100, Math.max(0, parsed.atsScore || 0)),
        skills: Array.isArray(parsed.skills)
          ? parsed.skills.map((skill: any) => ({
              name: skill.name || "",
              category:
                (skill.category as SkillCategory) || SkillCategory.TECHNICAL,
              confidence: Math.min(1, Math.max(0, skill.confidence || 0.5)),
              yearsExperience: skill.yearsExperience || undefined,
              level: (skill.level as SkillLevel) || SkillLevel.INTERMEDIATE,
            }))
          : [],
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions
          : [],
        personalInfo: parsed.personalInfo || {},
        experience: Array.isArray(parsed.experience)
          ? (parsed.experience as WorkExperience[])
          : [],
        education: Array.isArray(parsed.education)
          ? (parsed.education as Education[])
          : [],
        summary: parsed.summary || "",
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
        processingTime: 0, // Will be set by caller
      };
    } catch (error: unknown) {
      this.logger.error("Failed to parse Gemini analysis response", error);
      const errorMessage =
        error instanceof Error ? error.message : "Parse error";
      throw new Error(`Invalid response format: ${errorMessage}`);
    }
  }

  private parseSuggestionsResponse(response: string): string[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // Fallback: split by lines and filter
        return response
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 10)
          .slice(0, 8);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
    } catch (error) {
      this.logger.error("Failed to parse suggestions response", error);
      return ["Unable to generate suggestions at this time"];
    }
  }

  private parseMatchingResponse(response: string): JDMatchResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        overallScore?: number;
        skillMatches?: unknown[];
        missingSkills?: string[];
        strengthAreas?: string[];
        improvementAreas?: string[];
        recommendations?: string[];
        confidence?: number;
      };

      return {
        overallScore: Math.min(100, Math.max(0, parsed.overallScore || 0)),
        skillMatches: Array.isArray(parsed.skillMatches)
          ? (parsed.skillMatches as SkillMatch[])
          : [],
        missingSkills: Array.isArray(parsed.missingSkills)
          ? parsed.missingSkills
          : [],
        strengthAreas: Array.isArray(parsed.strengthAreas)
          ? parsed.strengthAreas
          : [],
        improvementAreas: Array.isArray(parsed.improvementAreas)
          ? parsed.improvementAreas
          : [],
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : [],
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      };
    } catch (error: unknown) {
      this.logger.error("Failed to parse matching response", error);
      const errorMessage =
        error instanceof Error ? error.message : "Parse error";
      throw new Error(`Invalid response format: ${errorMessage}`);
    }
  }
}
