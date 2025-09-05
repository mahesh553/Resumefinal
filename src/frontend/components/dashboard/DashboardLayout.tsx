'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  FiUser,
  FiFileText,
  FiTarget,
  FiTrendingUp,
  FiClock,
  FiSettings,
  FiHelpCircle,
  FiBell,
  FiSearch,
  FiPlus,
} from 'react-icons/fi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AdvancedFileUpload } from '@/components/ui/AdvancedFileUpload';
import { ResumeAnalysisResults } from './ResumeAnalysisResults';
import { JobTrackerSection } from './JobTrackerSection';

export function DashboardLayout() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const navigation = [
    { id: 'overview', label: 'Overview', icon: FiTrendingUp },
    { id: 'upload', label: 'Upload Resume', icon: FiFileText },
    { id: 'analysis', label: 'Analysis Results', icon: FiTarget },
    { id: 'jobs', label: 'Job Tracker', icon: FiClock },
    { id: 'settings', label: 'Settings', icon: FiSettings },
  ];

  const stats = [
    { label: 'Resumes Analyzed', value: '12', change: '+3 this week', color: 'text-blue-600' },
    { label: 'Average ATS Score', value: '78%', change: '+5% improvement', color: 'text-green-600' },
    { label: 'Job Applications', value: '24', change: '+8 this month', color: 'text-purple-600' },
    { label: 'Interview Calls', value: '6', change: '+2 this week', color: 'text-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Top Navigation */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold gradient-text">QoderResume</h1>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">Dashboard</span>
            </div>

            {/* Search */}
            <div className="hidden md:flex items-center space-x-4 flex-1 max-w-md ml-8">
              <div className="relative w-full">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search resumes, jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-primary pl-10"
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <FiBell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <FiHelpCircle className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <FiUser className="w-4 h-4 text-primary-600" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">Free Plan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-64 space-y-2"
          >
            {navigation.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-primary-50 text-primary-700 border border-primary-200' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <IconComponent className={`w-5 h-5 ${isActive ? 'text-primary-600' : ''}`} />
                  <span className="font-medium">{item.label}</span>
                </motion.button>
              );
            })}
          </motion.aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Page Header */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {navigation.find(nav => nav.id === activeTab)?.label}
              </h2>
              <p className="text-gray-600">
                {activeTab === 'overview' && 'Monitor your resume optimization progress and job search analytics'}
                {activeTab === 'upload' && 'Upload and analyze your resume with AI-powered insights'}
                {activeTab === 'analysis' && 'View detailed analysis results and improvement suggestions'}
                {activeTab === 'jobs' && 'Track your job applications and manage your career pipeline'}
                {activeTab === 'settings' && 'Customize your account and preferences'}
              </p>
            </motion.div>

            {/* Tab Content */}
            <div className="space-y-8">
              {activeTab === 'overview' && (
                <>
                  {/* Stats Grid */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                  >
                    {stats.map((stat, index) => (
                      <motion.div
                        key={stat.label}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        whileHover={{ y: -2 }}
                      >
                        <Card variant="hover-lift" size="md">
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                                <p className={`text-sm mt-1 ${stat.color}`}>{stat.change}</p>
                              </div>
                              <div className={`w-12 h-12 rounded-full ${stat.color.replace('text-', 'bg-').replace('600', '100')} flex items-center justify-center`}>
                                <FiTrendingUp className={`w-6 h-6 ${stat.color}`} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Quick Actions */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Button 
                            size="lg" 
                            className="h-20 flex-col"
                            onClick={() => setActiveTab('upload')}
                            leftIcon={<FiPlus />}
                          >
                            Upload New Resume
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="lg" 
                            className="h-20 flex-col"
                            onClick={() => setActiveTab('jobs')}
                          >
                            Add Job Application
                          </Button>
                          <Button 
                            variant="outline" 
                            size="lg" 
                            className="h-20 flex-col"
                            onClick={() => setActiveTab('analysis')}
                          >
                            View Analytics
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Recent Activity */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[
                            { action: 'Resume analyzed', target: 'Software_Engineer_Resume.pdf', time: '2 hours ago', status: 'success' },
                            { action: 'Job application added', target: 'Frontend Developer at Google', time: '1 day ago', status: 'pending' },
                            { action: 'ATS score improved', target: 'Marketing_Resume.pdf', time: '2 days ago', status: 'success' },
                            { action: 'Interview scheduled', target: 'Senior Developer at Microsoft', time: '3 days ago', status: 'success' },
                          ].map((activity, index) => (
                            <div key={index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className={`w-2 h-2 rounded-full ${activity.status === 'success' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                                <p className="text-sm text-gray-600">{activity.target}</p>
                              </div>
                              <span className="text-xs text-gray-500">{activity.time}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </>
              )}

              {activeTab === 'upload' && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card size="lg">
                    <CardHeader>
                      <CardTitle>Upload Your Resume</CardTitle>
                      <p className="text-gray-600">
                        Upload your resume for AI-powered analysis and optimization suggestions
                      </p>
                    </CardHeader>
                    <CardContent>
                      <AdvancedFileUpload
                        maxFiles={3}
                        onFilesUploaded={(files) => {
                          console.log('Files uploaded:', files);
                        }}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'analysis' && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <ResumeAnalysisResults />
                </motion.div>
              )}

              {activeTab === 'jobs' && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <JobTrackerSection />
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">Settings panel coming soon...</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}