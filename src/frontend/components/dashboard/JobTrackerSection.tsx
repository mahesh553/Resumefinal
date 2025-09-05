'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BriefcaseIcon,
  MapPinIcon,
  CalendarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { JobStatusBadge } from '@/components/ui/JobStatusBadge';
import { formatDate, getStatusColor } from '@/lib/utils';
import type { Job } from '@/types';

const mockJobs: Job[] = [
  {
    id: '1',
    userId: '1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp Inc.',
    description: 'Looking for an experienced frontend developer...',
    requirements: ['React', 'TypeScript', 'Next.js'],
    location: 'San Francisco, CA',
    type: 'full-time',
    status: 'interview',
    applicationDate: '2024-01-15',
    notes: 'Phone interview scheduled for next week',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  },
  {
    id: '2',
    userId: '1',
    title: 'Full Stack Engineer',
    company: 'StartupXYZ',
    description: 'Join our growing team...',
    requirements: ['Node.js', 'React', 'PostgreSQL'],
    location: 'Remote',
    type: 'full-time',
    status: 'applied',
    applicationDate: '2024-01-20',
    createdAt: '2024-01-20T09:00:00Z',
    updatedAt: '2024-01-20T09:00:00Z',
  },
  {
    id: '3',
    userId: '1',
    title: 'React Developer',
    company: 'BigTech Solutions',
    description: 'Exciting opportunity to work on...',
    requirements: ['React', 'Redux', 'JavaScript'],
    location: 'New York, NY',
    type: 'contract',
    status: 'offer',
    applicationDate: '2024-01-10',
    notes: 'Offer received - $120k',
    createdAt: '2024-01-10T11:00:00Z',
    updatedAt: '2024-01-25T16:00:00Z',
  },
];

const statusFilters = [
  { value: 'all', label: 'All Jobs', count: mockJobs.length },
  { value: 'applied', label: 'Applied', count: mockJobs.filter(j => j.status === 'applied').length },
  { value: 'interview', label: 'Interview', count: mockJobs.filter(j => j.status === 'interview').length },
  { value: 'offer', label: 'Offer', count: mockJobs.filter(j => j.status === 'offer').length },
  { value: 'rejected', label: 'Rejected', count: mockJobs.filter(j => j.status === 'rejected').length },
];

export function JobTrackerSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobs, setJobs] = useState(mockJobs);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="card">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-semibold text-gray-900 mb-2">
            Job Tracker
          </h2>
          <p className="text-gray-600">
            Track your job applications and manage your job search progress.
          </p>
        </div>
        
        <Button className="button-primary mt-4 md:mt-0">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Job
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs by title or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-primary pl-10"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-primary w-auto min-w-[120px]"
          >
            {statusFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label} ({filter.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statusFilters.map((filter) => (
          <motion.button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              statusFilter === filter.value
                ? 'bg-primary-100 text-primary-700 border border-primary-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {filter.label}
            <span className="ml-1 text-xs opacity-75">({filter.count})</span>
          </motion.button>
        ))}
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
              <BriefcaseIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Jobs Found
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Start tracking your job applications.'}
            </p>
            <Button className="button-primary">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Your First Job
            </Button>
          </div>
        ) : (
          filteredJobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {job.title}
                      </h3>
                      <p className="text-primary-600 font-medium">
                        {job.company}
                      </p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <BriefcaseIcon className="w-4 h-4" />
                      {job.type}
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      Applied {formatDate(job.applicationDate)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.requirements.slice(0, 3).map((req) => (
                      <span
                        key={req}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                      >
                        {req}
                      </span>
                    ))}
                    {job.requirements.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        +{job.requirements.length - 3} more
                      </span>
                    )}
                  </div>

                  {job.notes && (
                    <p className="text-sm text-gray-600 italic">
                      "{job.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <EyeIcon className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-error-600 hover:text-error-700">
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination would go here */}
      {filteredJobs.length > 0 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <span className="px-3 py-2 text-sm text-gray-600">
              Page 1 of 1
            </span>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}