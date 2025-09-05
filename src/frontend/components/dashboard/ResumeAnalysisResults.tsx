'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  TrophyIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { FiBarChart, FiDownload, FiEye, FiTrendingUp, FiRefreshCw } from 'react-icons/fi';
import { CircularProgressBar } from '@/components/ui/CircularProgressBar';
import { ScoreCard } from '@/components/ui/ScoreCard';
import { SuggestionCard } from '@/components/ui/SuggestionCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalTitle, ModalDescription } from '@/components/ui/Modal';

const mockAnalysisData = {
  fileName: 'Senior_Developer_Resume.pdf',
  uploadDate: '2024-09-05T14:30:00Z',
  analysisTime: '45 seconds',
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
    'Strong technical skills section with relevant technologies',
    'Clear and concise work experience descriptions',
    'Relevant keywords for target role included',
    'Professional formatting and clean layout',
    'Quantified achievements in most roles',
    'Education section properly structured',
  ],
  suggestions: [
    {
      id: '1',
      type: 'content' as const,
      priority: 'high' as const,
      title: 'Add More Quantified Achievements',
      description: 'Include specific metrics and numbers to demonstrate your impact. Quantified achievements are 40% more likely to catch recruiters attention.',
      example: 'Led a team of 5 developers to deliver 3 major projects, reducing deployment time by 40%',
      impact: 'High impact on recruiter attention',
      estimatedImprovement: '+8 points',
    },
    {
      id: '2',
      type: 'keywords' as const,
      priority: 'medium' as const,
      title: 'Include Industry Keywords',
      description: 'Add more relevant keywords from the job description to improve ATS compatibility.',
      example: 'React, Node.js, TypeScript, AWS, Docker, CI/CD',
      impact: 'Improves ATS ranking',
      estimatedImprovement: '+5 points',
    },
    {
      id: '3',
      type: 'formatting' as const,
      priority: 'low' as const,
      title: 'Improve Section Headers',
      description: 'Use stronger, more descriptive section headers to improve readability.',
      example: 'Professional Experience → Technical Leadership Experience',
      impact: 'Better readability',
      estimatedImprovement: '+2 points',
    },
  ],
  keywords: {
    found: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Git', 'HTML', 'CSS', 'Python'],
    missing: ['TypeScript', 'AWS', 'Docker', 'Redis', 'PostgreSQL', 'Kubernetes'],
    suggestions: ['Microservices', 'CI/CD', 'REST API', 'GraphQL', 'Jest', 'Webpack'],
  },
  trends: [
    { period: 'Week 1', score: 72 },
    { period: 'Week 2', score: 78 },
    { period: 'Week 3', score: 81 },
    { period: 'Week 4', score: 85 },
  ],
  competitorAnalysis: {
    averageScore: 76,
    topPercentile: 90,
    yourRanking: '78th percentile',
  },
};

export function ResumeAnalysisResults() {
  const hasAnalysis = true; // This would come from your state management
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRegenerating(false);
  };

  if (!hasAnalysis) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
          <ChartBarIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Analysis Available
        </h3>
        <p className="text-gray-600">
          Upload a resume to see detailed AI-powered analysis and optimization suggestions.
        </p>
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
              {mockAnalysisData.fileName}
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4" />
              Analyzed {mockAnalysisData.analysisTime} ago
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
            leftIcon={<FiRefreshCw className={isRegenerating ? 'animate-spin' : ''} />}
            onClick={handleRegenerate}
            loading={isRegenerating}
          >
            Re-analyze
          </Button>
        </div>
      </motion.div>

      {/* Score Improvement Alert */}
      {mockAnalysisData.improvement > 0 && (
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
              <h3 className="font-semibold text-green-900">Great Progress!</h3>
              <p className="text-green-700 text-sm">
                Your resume score improved by {mockAnalysisData.improvement} points since last analysis
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
          <Card variant="glass" className="bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200">
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">ATS Compatibility</h3>
                <TrophyIcon className="w-6 h-6 text-primary-600" />
              </div>
              
              <div className="flex items-center gap-6">
                <CircularProgressBar
                  percentage={mockAnalysisData.atsScore}
                  size={80}
                  strokeWidth={8}
                  color="primary"
                />
                <div>
                  <p className="text-3xl font-bold text-primary-600">
                    {mockAnalysisData.atsScore}%
                  </p>
                  <p className="text-sm text-gray-600">
                    Excellent compatibility
                  </p>
                  <p className="text-xs text-primary-600 font-medium mt-1">
                    +{mockAnalysisData.atsScore - mockAnalysisData.competitorAnalysis.averageScore} vs avg
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
          <Card variant="glass" className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Overall Score</h3>
                <SparklesIcon className="w-6 h-6 text-green-600" />
              </div>
              
              <div className="flex items-center gap-6">
                <CircularProgressBar
                  percentage={mockAnalysisData.overallScore}
                  size={80}
                  strokeWidth={8}
                  color="green"
                />
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {mockAnalysisData.overallScore}%
                  </p>
                  <p className="text-sm text-gray-600">
                    Very good quality
                  </p>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    {mockAnalysisData.competitorAnalysis.yourRanking}
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
          <Card variant="glass" className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Potential Score</h3>
                <LightBulbIcon className="w-6 h-6 text-orange-600" />
              </div>
              
              <div className="flex items-center gap-6">
                <CircularProgressBar
                  percentage={mockAnalysisData.competitorAnalysis.topPercentile}
                  size={80}
                  strokeWidth={8}
                  color="orange"
                />
                <div>
                  <p className="text-3xl font-bold text-orange-600">
                    {mockAnalysisData.competitorAnalysis.topPercentile}%
                  </p>
                  <p className="text-sm text-gray-600">
                    With improvements
                  </p>
                  <p className="text-xs text-orange-600 font-medium mt-1">
                    +{mockAnalysisData.competitorAnalysis.topPercentile - mockAnalysisData.overallScore} points possible
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
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Detailed Analysis</h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(mockAnalysisData.scores).map(([category, score], index) => (
            <ScoreCard
              key={category}
              title={category.charAt(0).toUpperCase() + category.slice(1)}
              score={score}
              delay={index * 0.1}
            />
          ))}
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
          {mockAnalysisData.strengths.map((strength, index) => (
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
              Implementing these suggestions could increase your score by up to{' '}
              <span className="font-semibold text-primary-600">
                +{mockAnalysisData.suggestions.reduce((acc, s) => acc + parseInt(s.estimatedImprovement.replace('+', '').replace(' points', '')), 0)} points
              </span>
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockAnalysisData.suggestions.map((suggestion, index) => (
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                          suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {suggestion.priority} priority
                        </span>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {suggestion.type}
                        </span>
                        <span className="text-xs font-semibold text-green-600">
                          {suggestion.estimatedImprovement}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{suggestion.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                      <p className="text-xs text-gray-500">{suggestion.impact}</p>
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
              {mockAnalysisData.keywords.found.length} of {mockAnalysisData.keywords.found.length + mockAnalysisData.keywords.missing.length} recommended keywords found
            </p>
          </CardHeader>
          <CardContent>
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Keyword Coverage</span>
                <span>{Math.round((mockAnalysisData.keywords.found.length / (mockAnalysisData.keywords.found.length + mockAnalysisData.keywords.missing.length)) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(mockAnalysisData.keywords.found.length / (mockAnalysisData.keywords.found.length + mockAnalysisData.keywords.missing.length)) * 100}%` }}
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
                  Found Keywords ({mockAnalysisData.keywords.found.length})
                </h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {mockAnalysisData.keywords.found.map((keyword, index) => (
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
                  Missing Keywords ({mockAnalysisData.keywords.missing.length})
                </h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {mockAnalysisData.keywords.missing.map((keyword, index) => (
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
                  Suggested Keywords ({mockAnalysisData.keywords.suggestions.length})
                </h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {mockAnalysisData.keywords.suggestions.map((keyword, index) => (
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
                  <h4 className="font-medium text-gray-900 mb-2">Why this matters:</h4>
                  <p className="text-gray-600">{selectedSuggestion.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Example:</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <code className="text-sm text-gray-800">{selectedSuggestion.example}</code>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700">Estimated Impact:</span>
                  <span className="font-semibold text-green-800">{selectedSuggestion.estimatedImprovement}</span>
                </div>
              </div>
            </ModalBody>
          </>
        )}
      </Modal>
    </div>
  );
}