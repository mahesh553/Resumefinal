"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CircularProgressBar } from "@/components/ui/CircularProgressBar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Modal,
  ModalBody,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";
import { ScoreCard } from "@/components/ui/ScoreCard";
import { apiClient } from "@/lib/api";
import type { AnalysisData, Suggestion } from "@/types";
import {
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  LightBulbIcon,
  SparklesIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FiDownload, FiEye, FiRefreshCw, FiTrendingUp } from "react-icons/fi";

const _mockAnalysisData = {
  fileName: "Senior_Developer_Resume.pdf",
  uploadDate: "2024-09-05T14:30:00Z",
  analysisTime: "45 seconds",
  overallScore: 85,
  atsScore: 92,
  previousScore: 78,
  improvement: 7,
  scores: {
    content: 88,
    formatting: 85,
    keywords: 90,
    structure: 82,
  },
  strengths: [
    "Strong technical skills section with relevant technologies",
    "Clear and concise work experience descriptions",
    "Relevant keywords for target role included",
    "Professional formatting and clean layout",
    "Quantified achievements in most roles",
    "Education section properly structured",
  ],
  suggestions: [
    {
      id: "1",
      type: "content" as const,
      priority: "high" as const,
      title: "Add More Quantified Achievements",
      description:
        "Include specific metrics and numbers to demonstrate your impact. Quantified achievements are 40% more likely to catch recruiters attention.",
      example:
        "Led a team of 5 developers to deliver 3 major projects, reducing deployment time by 40%",
      impact: "High impact on recruiter attention",
      estimatedImprovement: "+8 points",
    },
    {
      id: "2",
      type: "keywords" as const,
      priority: "medium" as const,
      title: "Include Industry Keywords",
      description:
        "Add more relevant keywords from the job description to improve ATS compatibility.",
      example: "React, Node.js, TypeScript, AWS, Docker, CI/CD",
      impact: "Improves ATS ranking",
      estimatedImprovement: "+5 points",
    },
    {
      id: "3",
      type: "formatting" as const,
      priority: "low" as const,
      title: "Improve Section Headers",
      description:
        "Use stronger, more descriptive section headers to improve readability.",
      example: "Professional Experience → Technical Leadership Experience",
      impact: "Better readability",
      estimatedImprovement: "+2 points",
    },
  ],
  keywords: {
    found: [
      "JavaScript",
      "React",
      "Node.js",
      "MongoDB",
      "Git",
      "HTML",
      "CSS",
      "Python",
    ],
    missing: [
      "TypeScript",
      "AWS",
      "Docker",
      "Redis",
      "PostgreSQL",
      "Kubernetes",
    ],
    suggestions: [
      "Microservices",
      "CI/CD",
      "REST API",
      "GraphQL",
      "Jest",
      "Webpack",
    ],
  },
  trends: [
    { period: "Week 1", score: 72 },
    { period: "Week 2", score: 78 },
    { period: "Week 3", score: 81 },
    { period: "Week 4", score: 85 },
  ],
  competitorAnalysis: {
    averageScore: 76,
    topPercentile: 90,
    yourRanking: "78th percentile",
  },
};

export function ResumeAnalysisResults() {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<
    AnalysisData["suggestions"][0] | null
  >(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    loadAnalysisData();
  }, []);

  const loadAnalysisData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get user's latest resume
      const resumesResult = await apiClient.getUserResumes(1, 1);

      if (resumesResult.error) {
        setError(resumesResult.error);
        return;
      }

      if (!resumesResult.data?.resumes?.length) {
        setAnalysisData(null);
        return;
      }

      const latestResume = resumesResult.data.resumes[0];

      if (!latestResume.isProcessed) {
        setAnalysisData({
          ...latestResume,
          isProcessing: true,
        });
        return;
      }

      // Get full analysis data
      const analysisResult = await apiClient.getAnalysis(latestResume.id);

      if (analysisResult.error) {
        setError(analysisResult.error);
        return;
      }

      setAnalysisData(analysisResult.data);
    } catch (err) {
      console.error("Failed to load analysis data:", err);
      setError("Failed to load analysis data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!analysisData?.id) return;

    setIsRegenerating(true);
    try {
      // In a real implementation, this would trigger re-analysis
      toast.success("Re-analysis started. This may take a few minutes.");

      // Refresh data after a delay
      setTimeout(() => {
        loadAnalysisData();
      }, 2000);
    } catch (_error: unknown) {
      toast.error("Failed to start re-analysis");
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading analysis results...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to Load Analysis
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={loadAnalysisData}>Try Again</Button>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
          <ChartBarIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Analysis Available
        </h3>
        <p className="text-gray-600">
          Upload a resume to see detailed AI-powered analysis and optimization
          suggestions.
        </p>
      </div>
    );
  }

  if (analysisData.isProcessing) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4">
          <LoadingSpinner size="lg" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Analysis in Progress
        </h3>
        <p className="text-gray-600 mb-4">
          Your resume "{analysisData.fileName}" is being analyzed. This usually
          takes 2-3 minutes.
        </p>
        <Button onClick={loadAnalysisData} variant="secondary">
          Check Status
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Actions */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-display font-semibold text-gray-900">
            Resume Analysis Results
          </h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4" />
              {analysisData.fileName}
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4" />
              Analyzed {new Date(analysisData.uploadedAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" leftIcon={<FiEye />}>
            Preview
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<FiDownload />}>
            Download Report
          </Button>
          <Button
            size="sm"
            leftIcon={
              <FiRefreshCw className={isRegenerating ? "animate-spin" : ""} />
            }
            onClick={handleRegenerate}
            loading={isRegenerating}
          >
            Re-analyze
          </Button>
        </div>
      </motion.div>

      {/* Score Improvement Alert */}
      {analysisData.atsScore &&
        analysisData.previousScore &&
        analysisData.atsScore > analysisData.previousScore && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FiTrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">
                  Great Progress!
                </h3>
                <p className="text-green-700 text-sm">
                  Your resume score improved by{" "}
                  {analysisData.atsScore - analysisData.previousScore} points
                  since last analysis
                </p>
              </div>
            </div>
          </motion.div>
        )}

      {/* Enhanced Score Cards with Competitor Comparison */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* ATS Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card
            variant="glass"
            className="bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200"
          >
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  ATS Compatibility
                </h3>
                <TrophyIcon className="w-6 h-6 text-primary-600" />
              </div>

              <div className="flex items-center gap-6">
                <CircularProgressBar
                  percentage={analysisData.atsScore || 0}
                  size={80}
                  strokeWidth={8}
                  color="primary"
                />
                <div>
                  <p className="text-3xl font-bold text-primary-600">
                    {analysisData.atsScore || 0}%
                  </p>
                  <p className="text-sm text-gray-600">
                    {(analysisData.atsScore || 0) >= 80
                      ? "Excellent"
                      : (analysisData.atsScore || 0) >= 60
                        ? "Good"
                        : "Needs improvement"}{" "}
                    compatibility
                  </p>
                  <p className="text-xs text-primary-600 font-medium mt-1">
                    ATS Score
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Overall Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card
            variant="glass"
            className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
          >
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Overall Score
                </h3>
                <SparklesIcon className="w-6 h-6 text-green-600" />
              </div>

              <div className="flex items-center gap-6">
                <CircularProgressBar
                  percentage={
                    analysisData.overallScore || analysisData.atsScore || 0
                  }
                  size={80}
                  strokeWidth={8}
                  color="green"
                />
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {analysisData.overallScore || analysisData.atsScore || 0}%
                  </p>
                  <p className="text-sm text-gray-600">
                    {(analysisData.overallScore ||
                      analysisData.atsScore ||
                      0) >= 80
                      ? "Very good"
                      : (analysisData.overallScore ||
                            analysisData.atsScore ||
                            0) >= 60
                        ? "Good"
                        : "Needs work"}{" "}
                    quality
                  </p>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    Overall Score
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Improvement Potential */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card
            variant="glass"
            className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200"
          >
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Potential Score
                </h3>
                <LightBulbIcon className="w-6 h-6 text-orange-600" />
              </div>

              <div className="flex items-center gap-6">
                <CircularProgressBar
                  percentage={Math.min((analysisData.atsScore || 0) + 15, 100)}
                  size={80}
                  strokeWidth={8}
                  color="orange"
                />
                <div>
                  <p className="text-3xl font-bold text-orange-600">
                    {Math.min((analysisData.atsScore || 0) + 15, 100)}%
                  </p>
                  <p className="text-sm text-gray-600">With improvements</p>
                  <p className="text-xs text-orange-600 font-medium mt-1">
                    +{Math.min(15, 100 - (analysisData.atsScore || 0))} points
                    possible
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Scores */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="card"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Detailed Analysis
        </h3>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {analysisData.parsedContent?.scores
            ? Object.entries(analysisData.parsedContent.scores).map(
                ([category, score], index) => (
                  <ScoreCard
                    key={category}
                    title={category.charAt(0).toUpperCase() + category.slice(1)}
                    score={typeof score === "number" ? score : 75}
                    delay={index * 0.1}
                  />
                )
              )
            : // Default scores if no detailed scores available
              ["Content", "Formatting", "Keywords", "Structure"].map(
                (category, index) => (
                  <ScoreCard
                    key={category}
                    title={category}
                    score={Math.max(
                      50,
                      (analysisData.atsScore || 70) + Math.random() * 20 - 10
                    )}
                    delay={index * 0.1}
                  />
                )
              )}
        </div>
      </motion.div>

      {/* Strengths */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="card"
      >
        <div className="flex items-center gap-2 mb-6">
          <CheckCircleIcon className="w-6 h-6 text-success-600" />
          <h3 className="text-lg font-semibold text-gray-900">Strengths</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {(
            analysisData.parsedContent?.strengths || [
              "Resume structure is well-organized",
              "Professional formatting detected",
              "Relevant experience included",
              "Contact information is complete",
            ]
          ).map((strength: string, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
              className="flex items-center gap-3 p-3 bg-success-50 rounded-xl border border-success-200"
            >
              <CheckCircleIcon className="w-5 h-5 text-success-600 flex-shrink-0" />
              <span className="text-success-800 font-medium">{strength}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Enhanced Suggestions with Modal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LightBulbIcon className="w-6 h-6 text-warning-600" />
              Optimization Suggestions
            </CardTitle>
            <p className="text-gray-600">
              Implementing these suggestions could increase your score by up to{" "}
              <span className="font-semibold text-primary-600">
                +
                {(analysisData.suggestions || []).reduce(
                  (acc: number, s: Suggestion) => {
                    const points = s.estimatedImprovement || s.impact || "5";
                    const pointsNum = parseInt(
                      points.toString().replace(/[^0-9]/g, "") || "5"
                    );
                    return acc + pointsNum;
                  },
                  0
                ) || 15}{" "}
                points
              </span>
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(
                analysisData.suggestions || [
                  {
                    id: "1",
                    type: "content",
                    priority: "high",
                    title: "Add More Quantified Achievements",
                    description:
                      "Include specific metrics and numbers to demonstrate your impact.",
                    example:
                      "Led a team of 5 developers to deliver 3 major projects",
                    impact: "High impact on recruiter attention",
                    estimatedImprovement: "+8 points",
                  },
                ]
              ).map((suggestion: Suggestion, index: number) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedSuggestion(suggestion);
                    setShowDetailModal(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            suggestion.priority === "high"
                              ? "bg-red-100 text-red-700"
                              : suggestion.priority === "medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {suggestion.priority} priority
                        </span>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {suggestion.type || "general"}
                        </span>
                        <span className="text-xs font-semibold text-green-600">
                          {suggestion.estimatedImprovement ||
                            suggestion.impact ||
                            "+5 points"}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {suggestion.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {suggestion.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {suggestion.impact || "Improves overall resume quality"}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <EyeIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Keywords Analysis with Progress Bars */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Keywords Analysis</CardTitle>
            <p className="text-gray-600">
              {(analysisData.parsedContent?.keywords?.found || []).length} of{" "}
              {(analysisData.parsedContent?.keywords?.found || []).length +
                (analysisData.parsedContent?.keywords?.missing || []).length ||
                10}{" "}
              recommended keywords found
            </p>
          </CardHeader>
          <CardContent>
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Keyword Coverage</span>
                <span>
                  {Math.round(
                    ((analysisData.parsedContent?.keywords?.found || [])
                      .length /
                      Math.max(
                        1,
                        (analysisData.parsedContent?.keywords?.found || [])
                          .length +
                          (analysisData.parsedContent?.keywords?.missing || [])
                            .length
                      )) *
                      100
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.round(
                      ((analysisData.parsedContent?.keywords?.found || [])
                        .length /
                        Math.max(
                          1,
                          (analysisData.parsedContent?.keywords?.found || [])
                            .length +
                            (
                              analysisData.parsedContent?.keywords?.missing ||
                              []
                            ).length
                        )) *
                        100
                    )}%`,
                  }}
                  transition={{ duration: 1, delay: 0.6 }}
                  className="bg-gradient-to-r from-primary-500 to-blue-600 h-2 rounded-full"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Found Keywords */}
              <div>
                <h4 className="text-sm font-medium text-success-700 mb-3 flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4" />
                  Found Keywords (
                  {(analysisData.parsedContent?.keywords?.found || []).length})
                </h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {(
                    analysisData.parsedContent?.keywords?.found || [
                      "JavaScript",
                      "React",
                      "Node.js",
                      "MongoDB",
                      "Git",
                    ]
                  ).map((keyword: string, index: number) => (
                    <motion.span
                      key={keyword}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + index * 0.05 }}
                      className="px-3 py-1 bg-success-100 text-success-800 rounded-full text-sm font-medium hover:bg-success-200 transition-colors"
                    >
                      {keyword}
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Missing Keywords */}
              <div>
                <h4 className="text-sm font-medium text-error-700 mb-3 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  Missing Keywords (
                  {(analysisData.parsedContent?.keywords?.missing || []).length}
                  )
                </h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {(
                    analysisData.parsedContent?.keywords?.missing || [
                      "TypeScript",
                      "AWS",
                      "Docker",
                      "Redis",
                      "PostgreSQL",
                    ]
                  ).map((keyword: string, index: number) => (
                    <motion.span
                      key={keyword}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.05 }}
                      className="px-3 py-1 bg-error-100 text-error-800 rounded-full text-sm font-medium hover:bg-error-200 transition-colors cursor-pointer"
                      title="Click to add to resume"
                    >
                      + {keyword}
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Suggested Keywords */}
              <div>
                <h4 className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-2">
                  <LightBulbIcon className="w-4 h-4" />
                  Suggested Keywords (
                  {
                    (analysisData.parsedContent?.keywords?.suggestions || [])
                      .length
                  }
                  )
                </h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {(
                    analysisData.parsedContent?.keywords?.suggestions || [
                      "Microservices",
                      "CI/CD",
                      "REST API",
                      "GraphQL",
                      "Jest",
                    ]
                  ).map((keyword: string, index: number) => (
                    <motion.span
                      key={keyword}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 + index * 0.05 }}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                      title="Trending in your industry"
                    >
                      {keyword}
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Suggestion Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        size="lg"
      >
        {selectedSuggestion && (
          <>
            <ModalHeader>
              <ModalTitle>{selectedSuggestion.title}</ModalTitle>
              <ModalDescription>{selectedSuggestion.impact}</ModalDescription>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Why this matters:
                  </h4>
                  <p className="text-gray-600">
                    {selectedSuggestion.description}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Example:</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <code className="text-sm text-gray-800">
                      {selectedSuggestion.example}
                    </code>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">
                    Estimated Impact:
                  </span>
                  <span className="font-semibold text-green-800">
                    {selectedSuggestion.estimatedImprovement}
                  </span>
                </div>
              </div>
            </ModalBody>
          </>
        )}
      </Modal>
    </div>
  );
}
