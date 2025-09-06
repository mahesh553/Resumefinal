"use client";

import { Button } from "@/components/ui/Button";
import { JobStatusBadge } from "@/components/ui/JobStatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Job as _Job } from "@/types";
import {
  BriefcaseIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export function JobTrackerSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobs, setJobs] = useState<_Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      await loadJobs();
      await loadStats();
    };
    fetchData();
  }, [statusFilter, pagination.page, searchTerm]);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const filters: Record<string, unknown> = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: "appliedDate",
        sortOrder: "DESC" as const,
      };

      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }

      if (searchTerm.trim()) {
        filters.vendorName = searchTerm.trim();
      }

      const result = await apiClient.getJobs(filters);

      if (result.error) {
        setError(result.error);
        return;
      }

      setJobs(result.data?.data || []);
      setPagination((prev) => ({
        ...prev,
        total: result.data?.pagination?.total || 0,
        totalPages: result.data?.pagination?.totalPages || 0,
      }));
    } catch (err) {
      console.error("Failed to load jobs:", err);
      setError("Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await apiClient.getJobStats();
      if (result.data?.statusCounts) {
        setStatusCounts(result.data.statusCounts);
      }
    } catch (err) {
      console.error("Failed to load job stats:", err);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job application?")) {
      return;
    }

    try {
      const result = await apiClient.deleteJob(jobId);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Job application deleted successfully");
      loadJobs();
      loadStats();
    } catch (err) {
      toast.error("Failed to delete job application");
    }
  };

  const _handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      const result = await apiClient.updateJobStatus(jobId, newStatus);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Status updated successfully");
      loadJobs();
      loadStats();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const statusFilters = [
    { value: "all", label: "All Jobs", count: pagination.total },
    {
      value: "applied",
      label: "Applied",
      count: statusCounts.applied || 0,
    },
    {
      value: "interview_scheduled",
      label: "Interview",
      count: statusCounts.interview_scheduled || 0,
    },
    {
      value: "offer_received",
      label: "Offer",
      count: statusCounts.offer_received || 0,
    },
    {
      value: "rejected",
      label: "Rejected",
      count: statusCounts.rejected || 0,
    },
  ];

  if (error) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to Load Jobs
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={loadJobs}>Try Again</Button>
      </div>
    );
  }

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
                ? "bg-primary-100 text-primary-700 border border-primary-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading jobs...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                <BriefcaseIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Jobs Found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "Try adjusting your search terms."
                  : "Start tracking your job applications."}
              </p>
              <Button className="button-primary">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Your First Job
              </Button>
            </div>
          ) : (
            jobs.map((job, index) => (
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
                          {job.jobTitle}
                        </h3>
                        <p className="text-primary-600 font-medium">
                          {job.vendorName}
                        </p>
                      </div>
                      <JobStatusBadge status={job.status} />
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                      {job.location && (
                        <div className="flex items-center gap-1">
                          <MapPinIcon className="w-4 h-4" />
                          {job.location}
                        </div>
                      )}
                      {job.salaryRange && (
                        <div className="flex items-center gap-1">
                          <BriefcaseIcon className="w-4 h-4" />
                          {job.salaryRange}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        Applied {formatDate(job.appliedDate)}
                      </div>
                    </div>

                    {job.notes && (
                      <p className="text-sm text-gray-600 italic mb-4">
                        "{job.notes}"
                      </p>
                    )}

                    {(job.followUpDate || job.interviewDate) && (
                      <div className="flex flex-wrap gap-4 text-sm">
                        {job.followUpDate && (
                          <div className="text-orange-600">
                            Follow up: {formatDate(job.followUpDate)}
                          </div>
                        )}
                        {job.interviewDate && (
                          <div className="text-green-600">
                            Interview: {formatDate(job.interviewDate)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <EyeIcon className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-error-600 hover:text-error-700"
                      onClick={() => handleDeleteJob(job.id)}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {jobs.length > 0 && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
            >
              Previous
            </Button>
            <span className="px-3 py-2 text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
