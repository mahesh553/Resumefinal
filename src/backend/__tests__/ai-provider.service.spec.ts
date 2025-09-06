import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import Redis from "ioredis";

import {
  JDMatchResult,
  ResumeAnalysisResult,
  SkillCategory,
  SkillLevel,
} from "../modules/ai/interfaces/ai-provider.interface";
import { ClaudeProvider } from "../modules/ai/providers/claude.provider";
import { GeminiProvider } from "../modules/ai/providers/gemini.provider";
import { OpenAIProvider } from "../modules/ai/providers/openai.provider";
import { AIProviderService } from "../modules/ai/services/ai-provider.service";

// Mock Redis
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    hincrby: jest.fn(),
    hincrbyfloat: jest.fn(),
    hgetall: jest.fn(),
    expire: jest.fn(),
  }));
});

describe("AIProviderService", () => {
  let service: AIProviderService;
  let configService: jest.Mocked<ConfigService>;
  let geminiProvider: jest.Mocked<GeminiProvider>;
  let openaiProvider: jest.Mocked<OpenAIProvider>;
  let claudeProvider: jest.Mocked<ClaudeProvider>;
  let mockRedis: any;

  const mockAnalysisResult: ResumeAnalysisResult = {
    atsScore: 85,
    skills: [
      {
        name: "JavaScript",
        category: SkillCategory.TECHNICAL,
        confidence: 0.9,
        level: SkillLevel.ADVANCED,
      },
      {
        name: "Communication",
        category: SkillCategory.SOFT,
        confidence: 0.8,
        level: SkillLevel.INTERMEDIATE,
      },
    ],
    suggestions: ["Add more quantifiable achievements"],
    personalInfo: {
      name: "John Doe",
      email: "john@example.com",
    },
    experience: [],
    education: [],
    confidence: 0.85,
    processingTime: 1500,
    text: "Analysis completed successfully",
  };

  const mockJDMatchResult: JDMatchResult = {
    overallScore: 78,
    skillMatches: [
      {
        skill: "JavaScript",
        resumeStrength: 0.9,
        jdRequirement: 0.7,
        isMatch: true,
      },
    ],
    missingSkills: ["Python", "Docker"],
    strengthAreas: ["Frontend Development"],
    improvementAreas: ["Backend Technologies"],
    recommendations: ["Consider adding Python experience"],
    confidence: 0.78,
  };

  beforeEach(async () => {
    // Create mock Redis instance
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      hincrby: jest.fn(),
      hincrbyfloat: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockGeminiProvider = {
      name: "gemini",
      isHealthy: true,
      priority: 1,
      costPerToken: 0.000125,
      analyze: jest.fn(),
      generateSuggestions: jest.fn(),
      matchJobDescription: jest.fn(),
    };

    const mockOpenAIProvider = {
      name: "openai",
      isHealthy: true,
      priority: 2,
      costPerToken: 0.002,
      analyze: jest.fn(),
      generateSuggestions: jest.fn(),
      matchJobDescription: jest.fn(),
    };

    const mockClaudeProvider = {
      name: "claude",
      isHealthy: false,
      priority: 3,
      costPerToken: 0.003,
      analyze: jest.fn(),
      generateSuggestions: jest.fn(),
      matchJobDescription: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: "REDIS",
          useValue: mockRedis,
        },
        {
          provide: GeminiProvider,
          useValue: mockGeminiProvider,
        },
        {
          provide: OpenAIProvider,
          useValue: mockOpenAIProvider,
        },
        {
          provide: ClaudeProvider,
          useValue: mockClaudeProvider,
        },
        {
          provide: AIProviderService,
          useFactory: (
            configService: ConfigService,
            redis: Redis,
            geminiProvider: GeminiProvider,
            openaiProvider: OpenAIProvider,
            claudeProvider: ClaudeProvider
          ) => {
            return new AIProviderService(
              configService,
              redis,
              geminiProvider,
              openaiProvider,
              claudeProvider
            );
          },
          inject: [
            ConfigService,
            "REDIS",
            GeminiProvider,
            OpenAIProvider,
            ClaudeProvider,
          ],
        },
      ],
    }).compile();

    service = module.get<AIProviderService>(AIProviderService);
    configService = module.get(ConfigService);
    geminiProvider = module.get(GeminiProvider);
    openaiProvider = module.get(OpenAIProvider);
    claudeProvider = module.get(ClaudeProvider);

    // Setup default config values
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        AI_CACHE_ENABLED: "true",
        AI_CACHE_TTL: "86400",
      };
      return config[key] || defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("analyzeResume", () => {
    const resumeContent = "Software Engineer with 5 years experience...";
    const fileName = "resume.pdf";

    it("should analyze resume using primary provider (Gemini)", async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null); // No cache
      geminiProvider.analyze.mockResolvedValue(mockAnalysisResult);
      mockRedis.setex.mockResolvedValue("OK");

      // Act
      const result = await service.analyzeResume({
        content: resumeContent,
        fileName,
      });

      // Assert
      expect(geminiProvider.analyze).toHaveBeenCalledWith(resumeContent, {
        fileName,
      });
      expect(result).toEqual(mockAnalysisResult);
      expect(mockRedis.setex).toHaveBeenCalled(); // Cache was set
    });

    it("should return cached result if available", async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(JSON.stringify(mockAnalysisResult));

      // Act
      const result = await service.analyzeResume({
        content: resumeContent,
        fileName,
      });

      // Assert
      expect(geminiProvider.analyze).not.toHaveBeenCalled();
      expect(result).toEqual(mockAnalysisResult);
    });

    it("should fallback to secondary provider if primary fails", async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null);
      geminiProvider.analyze.mockRejectedValue(new Error("Gemini API error"));
      openaiProvider.analyze.mockResolvedValue({
        ...mockAnalysisResult,
      });

      // Act
      const _result = await service.analyzeResume({
        content: resumeContent,
        fileName,
      });

      // Assert
      expect(geminiProvider.analyze).toHaveBeenCalled();
      expect(openaiProvider.analyze).toHaveBeenCalled();
      expect(geminiProvider.isHealthy).toBe(false); // Provider marked as unhealthy
    });

    it("should throw error if all providers fail", async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null);
      geminiProvider.analyze.mockRejectedValue(new Error("Gemini failed"));
      openaiProvider.analyze.mockRejectedValue(new Error("OpenAI failed"));
      claudeProvider.analyze.mockRejectedValue(new Error("Claude failed"));

      // Act & Assert
      await expect(
        service.analyzeResume({
          content: resumeContent,
          fileName,
        })
      ).rejects.toThrow("All AI providers failed for resume analysis");
    });

    it("should use specific provider when requested", async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null);
      openaiProvider.analyze.mockResolvedValue({
        ...mockAnalysisResult,
      });

      // Act
      const _result = await service.analyzeResume({
        content: resumeContent,
        fileName,
      });

      // Assert
      expect(geminiProvider.analyze).not.toHaveBeenCalled();
      expect(openaiProvider.analyze).toHaveBeenCalled();
    });
  });

  describe("matchJobDescription", () => {
    const resumeText = "Software Engineer with JavaScript experience...";
    const jobDescription =
      "Looking for Python developer with 3+ years experience...";

    it("should match job description successfully", async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null);
      geminiProvider.matchJobDescription.mockResolvedValue(mockJDMatchResult);

      // Act
      const result = await service.matchJobDescription(
        resumeText,
        jobDescription
      );

      // Assert
      expect(geminiProvider.matchJobDescription).toHaveBeenCalledWith(
        resumeText,
        jobDescription,
        undefined
      );
      expect(result).toEqual(mockJDMatchResult);
    });

    it("should handle provider failure with fallback", async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null);
      geminiProvider.matchJobDescription.mockRejectedValue(
        new Error("Gemini failed")
      );
      openaiProvider.matchJobDescription.mockResolvedValue({
        ...mockJDMatchResult,
      });

      // Act
      const _result = await service.matchJobDescription(
        resumeText,
        jobDescription
      );

      // Assert
      expect(geminiProvider.matchJobDescription).toHaveBeenCalled();
      expect(openaiProvider.matchJobDescription).toHaveBeenCalled();
    });
  });

  describe("generateSuggestions", () => {
    const resumeText = "Software Engineer resume content...";
    const jobDescription = "Job requirements...";

    it("should generate suggestions successfully", async () => {
      // Arrange
      const mockSuggestions = [
        "Add more quantifiable achievements",
        "Include relevant certifications",
        "Highlight leadership experience",
      ];
      mockRedis.get.mockResolvedValue(null);
      geminiProvider.generateSuggestions.mockResolvedValue(mockSuggestions);

      // Act
      const result = await service.generateSuggestions(
        resumeText,
        jobDescription
      );

      // Assert
      expect(geminiProvider.generateSuggestions).toHaveBeenCalledWith(
        resumeText,
        jobDescription,
        undefined
      );
      expect(result).toEqual(mockSuggestions);
    });
  });

  describe("getProviderHealth", () => {
    it("should return health status of all providers", async () => {
      // Act
      const result = await service.getProviderHealth();

      // Assert
      expect(result).toEqual({
        gemini: {
          isHealthy: true,
          priority: 1,
          costPerToken: 0.000125,
          lastCheck: expect.any(Date),
        },
        openai: {
          isHealthy: true,
          priority: 2,
          costPerToken: 0.002,
          lastCheck: expect.any(Date),
        },
        claude: {
          isHealthy: false,
          priority: 3,
          costPerToken: 0.003,
          lastCheck: expect.any(Date),
        },
      });
    });
  });

  describe("resetProviderHealth", () => {
    it("should reset all providers to healthy status", async () => {
      // Arrange
      geminiProvider.isHealthy = false;
      openaiProvider.isHealthy = false;

      // Act
      await service.resetProviderHealth();

      // Assert
      expect(geminiProvider.isHealthy).toBe(true);
      expect(openaiProvider.isHealthy).toBe(true);
      expect(claudeProvider.isHealthy).toBe(true);
    });
  });
});
