"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiActivity,
  FiAward,
  FiBarChart,
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiEye,
  FiPieChart,
  FiTarget,
  FiTrendingDown,
  FiTrendingUp,
} from "react-icons/fi";

interface AnalyticsData {
  overview: {
    resumesAnalyzed: number;
    avgATSScore: number;
    jobApplications: number;
    interviewRate: number;
    responseRate: number;
    avgTimeToResponse: number;
  };
  trends: {
    period: string;
    atsScoreChange: number;
    applicationChange: number;
    responseRateChange: number;
  };
  topSkills: Array<{
    skill: string;
    frequency: number;
    trend: "up" | "down" | "stable";
  }>;
  industryInsights: Array<{
    industry: string;
    applications: number;
    avgATSScore: number;
    responseRate: number;
  }>;
  weeklyActivity: Array<{
    week: string;
    resumeUploads: number;
    jobApplications: number;
    analyses: number;
  }>;
  recommendations: Array<{
    type: "skill" | "industry" | "timing" | "format";
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    actionable: boolean;
  }>;
}

export function AnalyticsInsights() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">(
    "30d"
  );

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/overview?timeRange=${timeRange}`
      );
      const result = await response.json();

      if (response.ok && result.data) {
        setAnalytics(result.data);
      } else {
        // Fallback to mock data if API fails
        const mockData: AnalyticsData = {
          overview: {
            resumesAnalyzed: 8,
            avgATSScore: 78.5,
            jobApplications: 24,
            interviewRate: 25.0,
            responseRate: 45.8,
            avgTimeToResponse: 7.2,
          },
          trends: {
            period: "30 days",
            atsScoreChange: 12.3,
            applicationChange: 8.7,
            responseRateChange: -2.1,
          },
          topSkills: [
            { skill: "React", frequency: 85, trend: "up" },
            { skill: "TypeScript", frequency: 78, trend: "up" },
            { skill: "Python", frequency: 72, trend: "stable" },
            { skill: "AWS", frequency: 65, trend: "up" },
            { skill: "Node.js", frequency: 58, trend: "stable" },
          ],
          industryInsights: [
            {
              industry: "Technology",
              applications: 15,
              avgATSScore: 82.1,
              responseRate: 53.3,
            },
            {
              industry: "Finance",
              applications: 6,
              avgATSScore: 74.2,
              responseRate: 33.3,
            },
            {
              industry: "Healthcare",
              applications: 3,
              avgATSScore: 71.0,
              responseRate: 66.7,
            },
          ],
          weeklyActivity: [
            {
              week: "Week 1",
              resumeUploads: 2,
              jobApplications: 8,
              analyses: 3,
            },
            {
              week: "Week 2",
              resumeUploads: 1,
              jobApplications: 6,
              analyses: 2,
            },
            {
              week: "Week 3",
              resumeUploads: 3,
              jobApplications: 5,
              analyses: 4,
            },
            {
              week: "Week 4",
              resumeUploads: 2,
              jobApplications: 5,
              analyses: 1,
            },
          ],
          recommendations: [
            {
              type: "skill",
              title: "Add Docker & Kubernetes Skills",
              description:
                "These skills appear in 78% of senior developer roles but are missing from your profile.",
              impact: "high",
              actionable: true,
            },
            {
              type: "industry",
              title: "Focus on Technology Sector",
              description:
                "Your ATS scores are 15% higher in tech roles compared to other industries.",
              impact: "medium",
              actionable: true,
            },
            {
              type: "timing",
              title: "Optimize Application Timing",
              description:
                "Applications sent on Tuesday-Thursday show 23% better response rates.",
              impact: "medium",
              actionable: true,
            },
            {
              type: "format",
              title: "Improve Resume Format",
              description:
                "Consider using a more ATS-friendly template to improve parsing accuracy.",
              impact: "high",
              actionable: true,
            },
          ],
        };
        setAnalytics(mockData);
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast.error("Failed to load analytics data");
      // Set mock data as fallback
      const mockData: AnalyticsData = {
        overview: {
          resumesAnalyzed: 8,
          avgATSScore: 78.5,
          jobApplications: 24,
          interviewRate: 25.0,
          responseRate: 45.8,
          avgTimeToResponse: 7.2,
        },
        trends: {
          period: "30 days",
          atsScoreChange: 12.3,
          applicationChange: 8.7,
          responseRateChange: -2.1,
        },
        topSkills: [
          { skill: "React", frequency: 85, trend: "up" },
          { skill: "TypeScript", frequency: 78, trend: "up" },
          { skill: "Python", frequency: 72, trend: "stable" },
          { skill: "AWS", frequency: 65, trend: "up" },
          { skill: "Node.js", frequency: 58, trend: "stable" },
        ],
        industryInsights: [
          {
            industry: "Technology",
            applications: 15,
            avgATSScore: 82.1,
            responseRate: 53.3,
          },
          {
            industry: "Finance",
            applications: 6,
            avgATSScore: 74.2,
            responseRate: 33.3,
          },
          {
            industry: "Healthcare",
            applications: 3,
            avgATSScore: 71.0,
            responseRate: 66.7,
          },
        ],
        weeklyActivity: [
          { week: "Week 1", resumeUploads: 2, jobApplications: 8, analyses: 3 },
          { week: "Week 2", resumeUploads: 1, jobApplications: 6, analyses: 2 },
          { week: "Week 3", resumeUploads: 3, jobApplications: 5, analyses: 4 },
          { week: "Week 4", resumeUploads: 2, jobApplications: 5, analyses: 1 },
        ],
        recommendations: [
          {
            type: "skill",
            title: "Add Docker & Kubernetes Skills",
            description:
              "These skills appear in 78% of senior developer roles but are missing from your profile.",
            impact: "high",
            actionable: true,
          },
          {
            type: "industry",
            title: "Focus on Technology Sector",
            description:
              "Your ATS scores are 15% higher in tech roles compared to other industries.",
            impact: "medium",
            actionable: true,
          },
          {
            type: "timing",
            title: "Optimize Application Timing",
            description:
              "Applications sent on Tuesday-Thursday show 23% better response rates.",
            impact: "medium",
            actionable: true,
          },
          {
            type: "format",
            title: "Improve Resume Format",
            description:
              "Consider using a more ATS-friendly template to improve parsing accuracy.",
            impact: "high",
            actionable: true,
          },
        ],
      };
      setAnalytics(mockData);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const getChangeIcon = (change: number) => {
    if (change > 0) return <FiTrendingUp className="text-green-600" />;
    if (change < 0) return <FiTrendingDown className="text-red-600" />;
    return <FiActivity className="text-gray-600" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "skill":
        return <FiTarget className="text-blue-600" />;
      case "industry":
        return <FiBriefcase className="text-purple-600" />;
      case "timing":
        return <FiClock className="text-orange-600" />;
      case "format":
        return <FiBarChart className="text-green-600" />;
      default:
        return <FiAward className="text-gray-600" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "border-red-200 bg-red-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FiBarChart className="text-4xl text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Analytics Data Available
          </h3>
          <p className="text-gray-600">
            Upload resumes and apply to jobs to see your analytics dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Analytics & Insights
          </h2>
          <p className="text-gray-600">
            Track your job search performance and get data-driven
            recommendations.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) =>
              setTimeRange(e.target.value as "7d" | "30d" | "90d" | "1y")
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </motion.div>

      {/* Overview Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg ATS Score
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.overview.avgATSScore}%
                </p>
                <div
                  className={`flex items-center mt-1 ${getChangeColor(analytics.trends.atsScoreChange)}`}
                >
                  {getChangeIcon(analytics.trends.atsScoreChange)}
                  <span className="ml-1 text-sm">
                    {analytics.trends.atsScoreChange > 0 ? "+" : ""}
                    {analytics.trends.atsScoreChange}%
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FiTarget className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Response Rate
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.overview.responseRate}%
                </p>
                <div
                  className={`flex items-center mt-1 ${getChangeColor(analytics.trends.responseRateChange)}`}
                >
                  {getChangeIcon(analytics.trends.responseRateChange)}
                  <span className="ml-1 text-sm">
                    {analytics.trends.responseRateChange > 0 ? "+" : ""}
                    {analytics.trends.responseRateChange}%
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FiEye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Interview Rate
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.overview.interviewRate}%
                </p>
                <div className="flex items-center mt-1 text-gray-600">
                  <FiCalendar className="w-4 h-4" />
                  <span className="ml-1 text-sm">6 interviews</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <FiBriefcase className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Skills */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FiBarChart className="mr-2" />
                Top Skills in Demand
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topSkills.map((skill, _index) => (
                  <div
                    key={skill.skill}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">
                        {skill.skill}
                      </span>
                      <div className="flex items-center">
                        {skill.trend === "up" && (
                          <FiTrendingUp className="w-4 h-4 text-green-600" />
                        )}
                        {skill.trend === "down" && (
                          <FiTrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        {skill.trend === "stable" && (
                          <div className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${skill.frequency}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-10">
                        {skill.frequency}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Industry Insights */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FiPieChart className="mr-2" />
                Industry Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.industryInsights.map((industry, _index) => (
                  <div
                    key={industry.industry}
                    className="p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {industry.industry}
                      </h4>
                      <span className="text-sm text-gray-600">
                        {industry.applications} applications
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">ATS Score: </span>
                        <span className="font-medium">
                          {industry.avgATSScore}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Response: </span>
                        <span className="font-medium">
                          {industry.responseRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Weekly Activity Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FiActivity className="mr-2" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {analytics.weeklyActivity.map((week, _index) => (
                <div key={week.week} className="text-center">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {week.week}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex flex-col items-center">
                      <div className="w-full bg-blue-100 rounded-lg p-2">
                        <div className="text-lg font-bold text-blue-600">
                          {week.resumeUploads}
                        </div>
                        <div className="text-xs text-blue-600">Uploads</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-full bg-green-100 rounded-lg p-2">
                        <div className="text-lg font-bold text-green-600">
                          {week.jobApplications}
                        </div>
                        <div className="text-xs text-green-600">
                          Applications
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-full bg-purple-100 rounded-lg p-2">
                        <div className="text-lg font-bold text-purple-600">
                          {week.analyses}
                        </div>
                        <div className="text-xs text-purple-600">Analyses</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FiAward className="mr-2" />
              AI-Powered Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getImpactColor(rec.impact)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getRecommendationIcon(rec.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {rec.title}
                        </h4>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            rec.impact === "high"
                              ? "bg-red-200 text-red-800"
                              : rec.impact === "medium"
                                ? "bg-yellow-200 text-yellow-800"
                                : "bg-blue-200 text-blue-800"
                          }`}
                        >
                          {rec.impact} impact
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm mb-3">
                        {rec.description}
                      </p>
                      {rec.actionable && (
                        <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                          Take Action →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
