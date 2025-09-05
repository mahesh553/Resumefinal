import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Job } from 'bull';

import { ResumeAnalysisProcessor } from '../queues/processors/resume-analysis.processor';
import { Resume } from '../database/entities/resume.entity';
import { AIProviderService } from '../modules/ai/services/ai-provider.service';
import { ResumeAnalysisResult, SkillCategory, SkillLevel } from '../modules/ai/interfaces/ai-provider.interface';
import { ResumeAnalysisJob } from '../queues/queue.types';

describe('ResumeAnalysisProcessor', () => {
  let processor: ResumeAnalysisProcessor;
  let resumeRepository: jest.Mocked<Repository<Resume>>;
  let aiProviderService: jest.Mocked<AIProviderService>;

  const mockResume: Resume = {
    id: 'resume-1',
    userId: 'user-1',
    fileName: 'test-resume.pdf',
    fileSize: 1024,
    fileType: 'application/pdf',
    content: 'Software Engineer with 5 years experience...',
    parsedContent: null,
    atsScore: undefined,
    suggestions: [],
    isProcessed: false,
    uploadedAt: new Date(),
    updatedAt: new Date(),
    user: null as any,
    versions: [],
  };

  const mockJob: Partial<Job<ResumeAnalysisJob>> = {
    data: {
      resumeId: 'resume-1',
      userId: 'user-1',
      fileContent: Buffer.from('file content'),
      provider: 'gemini',
    },
    progress: jest.fn(),
    log: jest.fn(),
  };

  const mockAnalysisResult: ResumeAnalysisResult = {
    atsScore: 85,
    skills: [
      { name: 'JavaScript', category: SkillCategory.TECHNICAL, confidence: 0.9, level: SkillLevel.ADVANCED }
    ],
    suggestions: ['Add more quantifiable achievements'],
    personalInfo: {
      name: 'John Doe',
      email: 'john@example.com'
    },
    experience: [],
    education: [],
    confidence: 0.85,
    processingTime: 1500,
    text: 'Analysis completed successfully',
  };

  beforeEach(async () => {
    const mockResumeRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    };

    const mockAIProviderService = {
      analyzeResume: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeAnalysisProcessor,
        {
          provide: getRepositoryToken(Resume),
          useValue: mockResumeRepository,
        },
        {
          provide: AIProviderService,
          useValue: mockAIProviderService,
        },
      ],
    }).compile();

    processor = module.get<ResumeAnalysisProcessor>(ResumeAnalysisProcessor);
    resumeRepository = module.get(getRepositoryToken(Resume));
    aiProviderService = module.get(AIProviderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleResumeAnalysis', () => {
    it('should successfully process resume analysis', async () => {
      // Arrange
      resumeRepository.findOne.mockResolvedValue(mockResume);
      aiProviderService.analyzeResume.mockResolvedValue(mockAnalysisResult);
      resumeRepository.update.mockResolvedValue({ affected: 1, generatedMaps: [], raw: {} });

      // Act
      const result = await processor.handleResumeAnalysis(mockJob as Job<ResumeAnalysisJob>);

      // Assert
      expect(mockJob.progress).toHaveBeenCalledWith(10);
      expect(resumeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'resume-1', userId: 'user-1' },
      });
      expect(aiProviderService.analyzeResume).toHaveBeenCalledWith({
        content: mockResume.content,
        fileName: mockResume.fileName,
        provider: 'gemini',
      });
      expect(resumeRepository.update).toHaveBeenCalledWith(
        'resume-1',
        expect.objectContaining({
          atsScore: 85,
          suggestions: mockAnalysisResult.suggestions,
          parsedContent: expect.objectContaining({
            skills: mockAnalysisResult.skills,
            experience: mockAnalysisResult.experience,
            education: mockAnalysisResult.education,
          }),
          isProcessed: true,
        })
      );
      expect(result).toEqual({
        success: true,
        resumeId: 'resume-1',
        atsScore: 85,
        suggestionsCount: 1,
        skillsCount: 1,
        status: 'completed',
      });
    });

    it('should throw error if resume not found', async () => {
      // Arrange
      resumeRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        processor.handleResumeAnalysis(mockJob as Job<ResumeAnalysisJob>)
      ).rejects.toThrow('Resume not found');

      expect(resumeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'resume-1', userId: 'user-1' },
      });
      expect(aiProviderService.analyzeResume).not.toHaveBeenCalled();
    });

    it('should handle AI service failure', async () => {
      // Arrange
      resumeRepository.findOne.mockResolvedValue(mockResume);
      aiProviderService.analyzeResume.mockRejectedValue(new Error('AI service failed'));

      // Act & Assert
      await expect(
        processor.handleResumeAnalysis(mockJob as Job<ResumeAnalysisJob>)
      ).rejects.toThrow('AI service failed');

      expect(resumeRepository.findOne).toHaveBeenCalled();
      expect(aiProviderService.analyzeResume).toHaveBeenCalled();
      expect(resumeRepository.update).not.toHaveBeenCalled();
    });

    it('should handle database update failure', async () => {
      // Arrange
      resumeRepository.findOne.mockResolvedValue(mockResume);
      aiProviderService.analyzeResume.mockResolvedValue(mockAnalysisResult);
      resumeRepository.update.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        processor.handleResumeAnalysis(mockJob as Job<ResumeAnalysisJob>)
      ).rejects.toThrow('Database error');

      expect(resumeRepository.findOne).toHaveBeenCalled();
      expect(aiProviderService.analyzeResume).toHaveBeenCalled();
      expect(resumeRepository.update).toHaveBeenCalled();
    });

    it('should update job progress during processing', async () => {
      // Arrange
      resumeRepository.findOne.mockResolvedValue(mockResume);
      aiProviderService.analyzeResume.mockResolvedValue(mockAnalysisResult);
      resumeRepository.update.mockResolvedValue({ affected: 1, generatedMaps: [], raw: {} });

      // Act
      await processor.handleResumeAnalysis(mockJob as Job<ResumeAnalysisJob>);

      // Assert
      expect(mockJob.progress).toHaveBeenCalledWith(10); // Initial progress
      expect(mockJob.progress).toHaveBeenCalledWith(50); // After analysis
      expect(mockJob.progress).toHaveBeenCalledWith(100); // Completion
    });

    it('should handle different AI providers', async () => {
      // Arrange
      const openaiJob = {
        ...mockJob,
        data: { ...mockJob.data!, provider: 'openai' as const },
      };
      resumeRepository.findOne.mockResolvedValue(mockResume);
      aiProviderService.analyzeResume.mockResolvedValue(mockAnalysisResult);
      resumeRepository.update.mockResolvedValue({ affected: 1, generatedMaps: [], raw: {} });

      // Act
      const result = await processor.handleResumeAnalysis(openaiJob as Job<ResumeAnalysisJob>);

      // Assert
      expect(aiProviderService.analyzeResume).toHaveBeenCalledWith({
        content: mockResume.content,
        fileName: mockResume.fileName,
        provider: 'openai',
      });
      expect(result.atsScore).toBe(85);
    });
  });
});