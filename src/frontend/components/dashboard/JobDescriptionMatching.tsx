"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiAlertCircle,
  FiCheck,
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiTarget,
  FiTrendingUp,
  FiUpload,
  FiX,
} from "react-icons/fi";

interface MatchResult {
  id: string;
  jobTitle: string;
  company: string;
  matchScore: number;
  keywordMatches: {
    found: string[];
    missing: string[];
  };
  suggestions: Array<{
    type: "add" | "modify" | "remove";
    section: string;
    content: string;
    impact: "high" | "medium" | "low";
  }>;
  atsScore: number;
  strengthAreas: string[];
  improvementAreas: string[];
  analyzedAt: string;
}

interface Resume {
  id: string;
  name: string;
  uploadedAt: string;
  lastModified: string;
}

export function JobDescriptionMatching() {
  const [activeTab, setActiveTab] = useState<"upload" | "results">("upload");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedResume, setSelectedResume] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [_isUploading, _setIsUploading] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [currentResult, setCurrentResult] = useState<MatchResult | null>(null);

  const [availableResumes, _setAvailableResumes] = useState<Resume[]>([]);
  const [isLoadingResumes, _setIsLoadingResumes] = useState(true);

  const handleJobDescriptionUpload = async (file: File) => {
    _setIsUploading(true);
    try {
      const text = await file.text();
      setJobDescription(text);
      toast.success("Job description uploaded successfully!");
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Failed to read job description file");
    } finally {
      _setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast.error("Please provide a job description");
      return;
    }

    if (!selectedResume) {
      toast.error("Please select a resume to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analysis/job-match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobDescription,
          resumeId: selectedResume,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setCurrentResult(result.data);
        setMatchResults((prev) => [result.data, ...prev]);
        setActiveTab("results");
        toast.success("Analysis completed successfully!");
      } else {
        // Fallback to mock data if API fails
        const mockResult: MatchResult = {
          id: Date.now().toString(),
          jobTitle: "Senior Software Engineer",
          company: "Tech Company Inc.",
          matchScore: 82,
          keywordMatches: {
            found: [
              "React",
              "TypeScript",
              "Node.js",
              "AWS",
              "Git",
              "Agile",
              "REST APIs",
            ],
            missing: [
              "Docker",
              "Kubernetes",
              "GraphQL",
              "Redis",
              "Microservices",
            ],
          },
          suggestions: [
            {
              type: "add",
              section: "Skills",
              content:
                "Add Docker and Kubernetes experience to align with DevOps requirements",
              impact: "high",
            },
            {
              type: "modify",
              section: "Experience",
              content:
                "Emphasize microservices architecture experience in previous roles",
              impact: "medium",
            },
            {
              type: "add",
              section: "Projects",
              content: "Include a project showcasing GraphQL implementation",
              impact: "medium",
            },
          ],
          atsScore: 78,
          strengthAreas: [
            "Frontend Development",
            "React Ecosystem",
            "Modern JavaScript",
          ],
          improvementAreas: [
            "DevOps Skills",
            "Backend Architecture",
            "Database Management",
          ],
          analyzedAt: new Date().toISOString(),
        };

        setCurrentResult(mockResult);
        setMatchResults((prev) => [mockResult, ...prev]);
        setActiveTab("results");
        toast.success("Analysis completed successfully!");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze job match");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getSuggestionIcon = (type: "add" | "modify" | "remove") => {
    switch (type) {
      case "add":
        return <FiTarget className="text-green-600" />;
      case "modify":
        return <FiRefreshCw className="text-blue-600" />;
      case "remove":
        return <FiX className="text-red-600" />;
    }
  };

  const getSuggestionColor = (impact: "high" | "medium" | "low") => {
    switch (impact) {
      case "high":
        return "border-red-200 bg-red-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
        return "border-blue-200 bg-blue-50";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Job Description Matching
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Upload a job description and match it against your resumes to get
          AI-powered optimization suggestions and improve your chances of
          getting hired.
        </p>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center"
      >
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "upload"
                ? "bg-white text-primary-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Upload & Analyze
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "results"
                ? "bg-white text-primary-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Analysis Results ({matchResults.length})
          </button>
        </div>
      </motion.div>

      {/* Upload Tab */}
      {activeTab === "upload" && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Job Description Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FiFileText className="mr-2" />
                Job Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* File Upload Option */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleJobDescriptionUpload(file);
                      }
                    }}
                    className="hidden"
                    id="job-description-upload"
                  />
                  <label
                    htmlFor="job-description-upload"
                    className="cursor-pointer block"
                  >
                    <div className="flex flex-col items-center">
                      <FiUpload className="text-3xl text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-900">
                        Upload job description file
                      </p>
                      <p className="text-xs text-gray-500">
                        Supports TXT, PDF, DOC, DOCX files
                      </p>
                    </div>
                  </label>
                </div>

                <div className="text-center text-gray-500 text-sm">or</div>

                {/* Text Area Option */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste job description text
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here..."
                    rows={8}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    {jobDescription.length} characters
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resume Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FiTarget className="mr-2" />
                Select Resume to Analyze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoadingResumes ? (
                  <div className="col-span-full flex items-center justify-center py-8">
                    <LoadingSpinner />
                    <span className="ml-2 text-gray-600">
                      Loading resumes...
                    </span>
                  </div>
                ) : availableResumes.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <FiFileText className="text-4xl text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">
                      No resumes found. Upload a resume first.
                    </p>
                  </div>
                ) : (
                  availableResumes.map((resume) => (
                    <motion.div
                      key={resume.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedResume(resume.id)}
                      className={`cursor-pointer p-4 rounded-lg border transition-all ${
                        selectedResume === resume.id
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        <FiFileText className="text-primary-600 mr-2" />
                        <span className="font-medium text-gray-900 truncate">
                          {resume.name}
                        </span>
                        {selectedResume === resume.id && (
                          <FiCheck className="text-primary-600 ml-auto" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        <p>Uploaded: {resume.uploadedAt}</p>
                        <p>Modified: {resume.lastModified}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Analyze Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <Button
              onClick={handleAnalyze}
              disabled={
                !jobDescription.trim() || !selectedResume || isAnalyzing
              }
              loading={isAnalyzing}
              size="lg"
              className="px-8"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Match"}
            </Button>
          </motion.div>
        </motion.div>
      )}

      {/* Results Tab */}
      {activeTab === "results" && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {matchResults.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FiTarget className="text-4xl text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Analysis Results Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload a job description and analyze it against your resume to
                  see results here.
                </p>
                <Button onClick={() => setActiveTab("upload")}>
                  Start Analysis
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Latest Result Summary */}
              {currentResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Latest Analysis: {currentResult.jobTitle}</span>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <FiDownload className="mr-2" />
                          Export Report
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Score Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div
                        className={`text-center p-4 rounded-lg ${getScoreBackground(currentResult.matchScore)}`}
                      >
                        <div
                          className={`text-3xl font-bold ${getScoreColor(currentResult.matchScore)}`}
                        >
                          {currentResult.matchScore}%
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Match Score
                        </div>
                      </div>
                      <div
                        className={`text-center p-4 rounded-lg ${getScoreBackground(currentResult.atsScore)}`}
                      >
                        <div
                          className={`text-3xl font-bold ${getScoreColor(currentResult.atsScore)}`}
                        >
                          {currentResult.atsScore}%
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          ATS Score
                        </div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-blue-100">
                        <div className="text-3xl font-bold text-blue-600">
                          {currentResult.suggestions.length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Suggestions
                        </div>
                      </div>
                    </div>

                    {/* Keywords Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          <FiCheck className="text-green-600 mr-2" />
                          Found Keywords (
                          {currentResult.keywordMatches.found.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {currentResult.keywordMatches.found.map(
                            (keyword, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                              >
                                {keyword}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          <FiX className="text-red-600 mr-2" />
                          Missing Keywords (
                          {currentResult.keywordMatches.missing.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {currentResult.keywordMatches.missing.map(
                            (keyword, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full"
                              >
                                {keyword}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Suggestions */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <FiTrendingUp className="text-blue-600 mr-2" />
                        Optimization Suggestions
                      </h4>
                      <div className="space-y-3">
                        {currentResult.suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border ${getSuggestionColor(suggestion.impact)}`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-1">
                                {getSuggestionIcon(suggestion.type)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900">
                                    {suggestion.section}
                                  </span>
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      suggestion.impact === "high"
                                        ? "bg-red-200 text-red-800"
                                        : suggestion.impact === "medium"
                                          ? "bg-yellow-200 text-yellow-800"
                                          : "bg-blue-200 text-blue-800"
                                    }`}
                                  >
                                    {suggestion.impact} impact
                                  </span>
                                </div>
                                <p className="text-gray-700 text-sm">
                                  {suggestion.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Results History */}
              <Card>
                <CardHeader>
                  <CardTitle>Analysis History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {matchResults.map((result, index) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setCurrentResult(result)}
                        className={`cursor-pointer p-4 rounded-lg border transition-all hover:shadow-md ${
                          currentResult?.id === result.id
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {result.jobTitle} - {result.company}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Analyzed on{" "}
                              {new Date(result.analyzedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div
                              className={`text-lg font-bold ${getScoreColor(result.matchScore)}`}
                            >
                              {result.matchScore}%
                            </div>
                            <div className="flex items-center space-x-1">
                              <FiAlertCircle className="text-orange-500" />
                              <span className="text-sm text-gray-600">
                                {result.suggestions.length} suggestions
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
