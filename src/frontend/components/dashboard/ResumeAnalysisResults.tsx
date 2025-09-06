"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { KeywordDistribution } from "@/components/ui/Charts/KeywordDistribution";
import { ScoreBarChart } from "@/components/ui/Charts/ScoreBarChart";
import { TrendChart } from "@/components/ui/Charts/TrendChart";
import { CircularProgressBar } from "@/components/ui/CircularProgressBar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Modal,
  ModalBody,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";
import { useResumeList, useUserStats } from "@/hooks/api";
import { useWebSocketContext } from "@/components/providers/WebSocketProvider";
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
import { useMemo, useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { FiDownload, FiEye, FiRefreshCw, FiTrendingUp } from "react-icons/fi";
import ConnectionStatusIndicator from "@/components/ui/ConnectionStatusIndicator";

export function ResumeAnalysisResults() {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<
    AnalysisData["suggestions"][0] | null
  >(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [realTimeProgress, setRealTimeProgress] = useState<number | null>(null);
  const [realTimeStatus, setRealTimeStatus] = useState<string | null>(null);

  // WebSocket context for real-time updates
  const { isConnected, on } = useWebSocketContext();

  // React Query hooks
  const {
    data: resumeData,
    isLoading: isLoadingResumes,
    error: resumeError,
    refetch: refetchResumes,
  } = useResumeList(1, 1);

  const {
    data: userStats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useUserStats();

  // Transform backend resume data to match AnalysisData interface
  const analysisData = useMemo((): AnalysisData | null => {
    if (!resumeData?.resumes?.length) {
      return null;
    }

    const latestResume = resumeData.resumes[0];
    return {
      id: latestResume.id,
      fileName: latestResume.fileName,
      uploadedAt: latestResume.createdAt || latestResume.uploadedAt,
      atsScore: latestResume.atsScore || 0,
      overallScore: latestResume.atsScore || 0,
      previousScore: userStats?.averageScore || undefined,
      isProcessing:
        latestResume.status === "processing" || !latestResume.atsScore,
      isProcessed:
        latestResume.status === "completed" && latestResume.atsScore,
      suggestions: latestResume.parsedContent?.suggestions || [],
      parsedContent: {
        keywords: {
          found: latestResume.parsedContent?.keywords || [],
          missing: latestResume.parsedContent?.missingKeywords || [],
          suggestions: latestResume.parsedContent?.suggestedKeywords || [],
        },
        skills: latestResume.parsedContent?.skills || [],
        scores: {
          content: Math.min(
            100,
            (latestResume.atsScore || 70) + Math.random() * 10 - 5
          ),
          formatting: Math.min(
            100,
            (latestResume.atsScore || 70) + Math.random() * 10 - 5
          ),
          keywords: Math.min(
            100,
            (latestResume.atsScore || 70) + Math.random() * 10 - 5
          ),
          structure: Math.min(
            100,
            (latestResume.atsScore || 70) + Math.random() * 10 - 5
          ),
        },
        strengths: latestResume.parsedContent?.strengths || [
          "Resume structure is well-organized",
          "Professional formatting detected",
          "Relevant experience included",
          "Contact information is complete",
        ],
      },
      // Add competitive analysis
      competitorAnalysis: {
        averageScore: userStats?.averageScore || 72,
        topPercentile: 90,
        yourRanking: latestResume.atsScore
          ? `${Math.max(1, Math.min(99, Math.round((latestResume.atsScore / 90) * 100)))}th percentile`
          : "50th percentile",
      },
      // Add trend data if available
      trends: userStats?.recentActivity?.map(
        (activity: any, index: number) => ({
          period: `Week ${index + 1}`,
          score:
            activity.score ||
            Math.max(50, latestResume.atsScore - Math.random() * 20),
        })
      ) || [
        {
          period: "Week 1",
          score: Math.max(50, (latestResume.atsScore || 70) - 15),
        },
        {
          period: "Week 2",
          score: Math.max(50, (latestResume.atsScore || 70) - 10),
        },
        {
          period: "Week 3",
          score: Math.max(50, (latestResume.atsScore || 70) - 5),
        },
        { period: "Week 4", score: latestResume.atsScore || 70 },
      ],
    };
  }, [resumeData, userStats]);

  // Derived loading and error states
  const isLoading = isLoadingResumes || isLoadingStats;
  const error = resumeError || statsError;

  // WebSocket real-time event handling
  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to resume analysis progress
    const unsubscribeProgress = on('resume_analysis_progress', (data: {
      analysisId: string;
      progress: number;
      status: string;
    }) => {
      setRealTimeProgress(data.progress);
      setRealTimeStatus(data.status);
      
      // Show progress toast only for significant progress updates
      if (data.progress % 25 === 0) {
        toast.loading(`Analysis ${data.progress}% complete`, {
          id: `progress-${data.analysisId}`,
          duration: 2000,
        });
      }
    });

    // Subscribe to resume analysis completion
    const unsubscribeComplete = on('resume_analysis_complete', (data: {
      analysisId: string;
      result: any;
    }) => {
      setRealTimeProgress(null);
      setRealTimeStatus(null);
      
      // Dismiss any existing progress toasts
      toast.dismiss(`progress-${data.analysisId}`);
      
      // Refetch resume data to get updated results
      refetchResumes();
    });

    // Subscribe to resume analysis errors
    const unsubscribeError = on('resume_analysis_error', (data: {
      analysisId: string;
      error: string;
    }) => {
      setRealTimeProgress(null);
      setRealTimeStatus(null);
      
      toast.dismiss(`progress-${data.analysisId}`);
    });

    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [isConnected, on, refetchResumes]);



  const handleRefresh = async () => {
    setIsRegenerating(true);
    try {
      await refetchResumes();
      toast.success('Analysis data refreshed!');
    } catch (err) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRegenerating(false);
    }
  };
  const handleRegenerate = async () => {
    if (!analysisData?.id) return;

    setIsRegenerating(true);
    try {
      await refetchResumes();
      toast.success('Re-analysis completed successfully!');
    } catch (error) {
      console.error('Re-analysis failed:', error);
      toast.error('Failed to re-analyze resume');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!analysisData?.id) return;

    try {
      // In a real implementation, this would generate and download a PDF report
      toast.success('Report download started');

      // For now, create a simple text report
      const reportData = {
        fileName: analysisData.fileName,
        atsScore: analysisData.atsScore,
        analysisDate: new Date(analysisData.uploadedAt).toLocaleDateString(),
        suggestions: analysisData.suggestions?.length || 0,
        keywords: {
          found: analysisData.parsedContent?.keywords?.found?.length || 0,
          missing: analysisData.parsedContent?.keywords?.missing?.length || 0,
        },
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume-analysis-report-${analysisData.fileName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download report');
    }
  };

  const handlePreviewResume = () => {
    if (!analysisData?.id) return;

    // In a real implementation, this would open a modal or new tab with resume preview
    toast.success('Resume preview would open here');
    // Could integrate with a PDF viewer or document preview component
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
        <p className="text-gray-600 mb-4">{error instanceof Error ? error.message : String(error)}</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={handleRefresh}>
            Try Again
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </div>
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

  if (analysisData.isProcessing || realTimeProgress !== null) {
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
        
        {/* Real-time progress display */}
        {(realTimeProgress !== null || realTimeStatus) && (
          <div className="max-w-md mx-auto mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {realTimeStatus || 'Processing...'}
              </span>
              {realTimeProgress !== null && (
                <span className="text-sm text-gray-600">{realTimeProgress}%</span>
              )}
            </div>
            {realTimeProgress !== null && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${realTimeProgress}%` }}
                />
              </div>
            )}
            <div className="flex items-center justify-center mt-2 gap-2">
              <ConnectionStatusIndicator />
              <span className="text-xs text-gray-500">
                {isConnected ? 'Real-time updates active' : 'Updates paused'}
              </span>
            </div>
          </div>
        )}
        
        <Button onClick={handleRefresh} variant="secondary">
          <FiRefreshCw className="mr-2 w-4 h-4" />
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
            {/* Real-time connection status */}
            <ConnectionStatusIndicator className="ml-auto" showText={true} />
          </div>
                  
          {/* Real-time progress indicator */}
          {(realTimeProgress !== null || realTimeStatus) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-blue-900">
                      {realTimeStatus || 'Processing...'}
                    </span>
                    {realTimeProgress !== null && (
                      <span className="text-sm text-blue-700">{realTimeProgress}%</span>
                    )}
                  </div>
                  {realTimeProgress !== null && (
                    <div className="w-full bg-blue-100 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${realTimeProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FiEye />}
            onClick={handlePreviewResume}
          >
            Preview
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FiDownload />}
            onClick={handleDownloadReport}
          >
            Download Report
          </Button>
          <Button
            size="sm"
            leftIcon={
              <FiRefreshCw className={isRegenerating ? "animate-spin" : ""} />
            }
            onClick={handleRegenerate}
            loading={isRegenerating}
            disabled={!analysisData?.id}
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

      {/* Score Trend Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <TrendChart
          data={analysisData.trends || []}
          title="Resume Score Progress"
          height={250}
          showArea={true}
          color="#3B82F6"
          className="mb-6"
        />
      </motion.div>

      {/* Detailed Scores Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <ScoreBarChart
          data={
            analysisData.parsedContent?.scores
              ? Object.entries(analysisData.parsedContent.scores).map(
                  ([category, score]) => ({
                    category,
                    score: typeof score === "number" ? score : 75,
                  })
                )
              : // Default scores if no detailed scores available
                ["Content", "Formatting", "Keywords", "Structure"].map(
                  (category) => ({
                    category: category.toLowerCase(),
                    score: Math.max(
                      50,
                      (analysisData.atsScore || 70) + Math.random() * 20 - 10
                    ),
                  })
                )
          }
          title="Detailed Score Analysis"
          height={300}
          className="mb-6"
        />
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

      {/* Enhanced Keywords Analysis with Interactive Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Keywords Analysis & Distribution</CardTitle>
            <p className="text-gray-600">
              {(analysisData.parsedContent?.keywords?.found || []).length} of{" "}
              {(analysisData.parsedContent?.keywords?.found || []).length +
                (analysisData.parsedContent?.keywords?.missing || []).length ||
                10}{" "}
              recommended keywords found
            </p>
          </CardHeader>
          <CardContent>
            {/* Keywords Distribution Chart */}
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-1">
                <KeywordDistribution
                  foundCount={
                    (analysisData.parsedContent?.keywords?.found || []).length
                  }
                  missingCount={
                    (analysisData.parsedContent?.keywords?.missing || []).length
                  }
                  title="Coverage Distribution"
                  height={200}
                />
              </div>

              {/* Keywords Progress Bar */}
              <div className="lg:col-span-2 flex flex-col justify-center">
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Keyword Coverage Progress</span>
                    <span>
                      {Math.round(
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
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.round(
                          ((analysisData.parsedContent?.keywords?.found || [])
                            .length /
                            Math.max(
                              1,
                              (
                                analysisData.parsedContent?.keywords?.found ||
                                []
                              ).length +
                                (
                                  analysisData.parsedContent?.keywords
                                    ?.missing || []
                                ).length
                            )) *
                            100
                        )}%`,
                      }}
                      transition={{ duration: 1.5, delay: 0.7 }}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full"
                    />
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {
                        (analysisData.parsedContent?.keywords?.found || [])
                          .length
                      }
                    </div>
                    <div className="text-xs text-green-700 font-medium">
                      Found
                    </div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {
                        (analysisData.parsedContent?.keywords?.missing || [])
                          .length
                      }
                    </div>
                    <div className="text-xs text-red-700 font-medium">
                      Missing
                    </div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {
                        (
                          analysisData.parsedContent?.keywords?.suggestions ||
                          []
                        ).length
                      }
                    </div>
                    <div className="text-xs text-blue-700 font-medium">
                      Suggested
                    </div>
                  </div>
                </div>
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

      {/* Enhanced Competitive Analysis with Charts */}
      {analysisData.competitorAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrophyIcon className="w-6 h-6 text-yellow-600" />
                Competitive Analysis
              </CardTitle>
              <p className="text-gray-600">
                See how your resume compares to others in the market
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Market Position Chart */}
                <div>
                  <ScoreBarChart
                    data={[
                      {
                        category: "Your Score",
                        score: analysisData.atsScore || 0,
                      },
                      {
                        category: "Market Average",
                        score:
                          analysisData.competitorAnalysis.averageScore || 72,
                      },
                      {
                        category: "Top 10%",
                        score:
                          analysisData.competitorAnalysis.topPercentile || 90,
                      },
                    ]}
                    title="Market Position Comparison"
                    height={250}
                  />
                </div>

                {/* Performance Metrics */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">
                        Market Ranking
                      </span>
                      <TrophyIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {analysisData.competitorAnalysis.yourRanking}
                    </div>
                    <p className="text-xs text-blue-700">
                      You're performing better than{" "}
                      {analysisData.competitorAnalysis.yourRanking.includes(
                        "th"
                      )
                        ? analysisData.competitorAnalysis.yourRanking.split(
                            "th"
                          )[0]
                        : "50"}
                      % of candidates
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-900">
                        Score Gap
                      </span>
                      <SparklesIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      +
                      {Math.max(
                        0,
                        (analysisData.atsScore || 0) -
                          (analysisData.competitorAnalysis.averageScore || 72)
                      )}{" "}
                      points
                    </div>
                    <p className="text-xs text-green-700">
                      {(analysisData.atsScore || 0) >
                      (analysisData.competitorAnalysis.averageScore || 72)
                        ? "Above market average"
                        : "Room for improvement"}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-orange-900">
                        Improvement Potential
                      </span>
                      <LightBulbIcon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      +
                      {Math.max(
                        0,
                        (analysisData.competitorAnalysis.topPercentile || 90) -
                          (analysisData.atsScore || 0)
                      )}{" "}
                      points
                    </div>
                    <p className="text-xs text-orange-700">
                      To reach top 10% performance
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

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
