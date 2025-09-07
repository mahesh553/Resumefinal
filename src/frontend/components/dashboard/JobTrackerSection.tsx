"use client";

import { useWebSocketContext } from "@/components/providers/WebSocketProvider";
import { Button } from "@/components/ui/Button";
import ConnectionStatusIndicator from "@/components/ui/ConnectionStatusIndicator";
import { EnhancedPagination } from "@/components/ui/EnhancedPagination";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useDeleteJob, useJobList, useJobStats } from "@/hooks/api";
import { apiClient } from "@/lib/api";
import { exportJobs } from "@/lib/exportUtils";
import type { Job as _Job } from "@/types";
import {
  BriefcaseIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { BulkOperations } from "./bulk/BulkOperations";
import {
  AdvancedJobFilters,
  type JobFilters,
} from "./filters/AdvancedJobFilters";
import { JobItem } from "./job/JobItem";
import { AddJobModal } from "./modals/AddJobModal";
import { EditJobModal } from "./modals/EditJobModal";
import { ViewJobModal } from "./modals/ViewJobModal";

export function JobTrackerSection() {
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [realTimeUpdates, setRealTimeUpdates] = useState<{
    [jobId: string]: { action: string; timestamp: string };
  }>({});

  // WebSocket context for real-time updates
  const { isConnected, on } = useWebSocketContext();

  // Advanced filtering state
  const [filters, setFilters] = useState<JobFilters>({
    search: "",
    status: "all",
    location: "",
    appliedAfter: "",
    appliedBefore: "",
    sortBy: "appliedDate",
    sortOrder: "DESC",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<_Job | null>(null);

  // Prepare filters for API
  const apiFilters = useMemo(() => {
    const result: Record<string, unknown> = {
      page: pagination.page,
      limit: pagination.limit,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    };

    // Apply filters
    if (filters.status !== "all") {
      result.status = filters.status;
    }

    if (filters.search.trim()) {
      result.vendorName = filters.search.trim();
    }

    if (filters.location.trim()) {
      result.location = filters.location.trim();
    }

    if (filters.appliedAfter) {
      result.appliedAfter = filters.appliedAfter;
    }

    if (filters.appliedBefore) {
      result.appliedBefore = filters.appliedBefore;
    }

    return result;
  }, [filters, pagination.page, pagination.limit]);

  // React Query hooks
  const {
    data: jobData,
    isLoading: isLoadingJobs,
    error: jobError,
    refetch: refetchJobs,
  } = useJobList(apiFilters);

  const {
    data: statsData,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useJobStats();

  const deleteJobMutation = useDeleteJob();

  // Extract data from React Query responses
  const jobs = jobData?.data || [];
  const jobPagination = jobData?.pagination || {};
  const statusCounts = statsData?.statusCounts || {};

  // WebSocket real-time event handling
  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to job updates (CRUD operations)
    const unsubscribeJobUpdate = on(
      "job_updated",
      (data: {
        job?: any;
        jobId?: string;
        action: "created" | "updated" | "deleted";
        timestamp: string;
      }) => {
        // Update real-time status for UI feedback
        if (data.jobId) {
          setRealTimeUpdates((prev) => ({
            ...prev,
            [data.jobId!]: { action: data.action, timestamp: data.timestamp },
          }));

          // Auto-clear the update indicator after 5 seconds
          setTimeout(() => {
            setRealTimeUpdates((prev) => {
              const newUpdates = { ...prev };
              if (data.jobId) {
                delete newUpdates[data.jobId];
              }
              return newUpdates;
            });
          }, 5000);
        }

        // Refetch job data and stats to get updated information
        refetchJobs();
        refetchStats();
      }
    );

    // Subscribe to job status updates
    const unsubscribeJobStatus = on(
      "job_status_updated",
      (data: {
        jobId: string;
        oldStatus: string;
        newStatus: string;
        timestamp: string;
      }) => {
        // Update real-time status indicator
        setRealTimeUpdates((prev) => ({
          ...prev,
          [data.jobId]: {
            action: `status_changed_${data.newStatus}`,
            timestamp: data.timestamp,
          },
        }));

        // Auto-clear after 5 seconds
        setTimeout(() => {
          setRealTimeUpdates((prev) => {
            const newUpdates = { ...prev };
            delete newUpdates[data.jobId];
            return newUpdates;
          });
        }, 5000);

        // Refetch data
        refetchJobs();
        refetchStats();
      }
    );

    return () => {
      unsubscribeJobUpdate();
      unsubscribeJobStatus();
    };
  }, [isConnected, on, refetchJobs, refetchStats]);

  // Update pagination when job data changes
  useEffect(() => {
    if (jobPagination && typeof jobPagination === "object") {
      setPagination((prev) => ({
        ...prev,
        total: (jobPagination as any).total || 0,
        totalPages: (jobPagination as any).totalPages || 0,
      }));
    }
  }, [jobPagination]);

  // Reset pagination when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSelectedJobs([]);
  }, [filters]);

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job application?")) {
      return;
    }

    try {
      await deleteJobMutation.mutateAsync(jobId);
    } catch (error) {
      // Error handling is done in the mutation
      console.error("Delete job error:", error);
    }
  };

  const handleViewJob = (job: _Job) => {
    setSelectedJob(job);
    setShowViewModal(true);
  };

  const handleEditJob = (job: _Job) => {
    setSelectedJob(job);
    setShowEditModal(true);
  };

  const handleAddJob = () => {
    setShowAddModal(true);
  };

  const handleJobAdded = () => {
    // React Query will automatically refetch the data
    refetchJobs();
    refetchStats();
  };

  const handleJobUpdated = () => {
    // React Query will automatically refetch the data
    refetchJobs();
    refetchStats();
  };

  // Filtering handlers
  const handleFiltersChange = (newFilters: Partial<JobFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleFiltersReset = () => {
    setFilters({
      search: "",
      status: "all",
      location: "",
      appliedAfter: "",
      appliedBefore: "",
      sortBy: "appliedDate",
      sortOrder: "DESC",
    });
  };

  // Selection handlers
  const handleJobSelect = (jobId: string, selected: boolean) => {
    setSelectedJobs((prev) =>
      selected ? [...prev, jobId] : prev.filter((id) => id !== jobId)
    );
  };

  const handleSelectAll = () => {
    setSelectedJobs(jobs.map((job) => job.id));
  };

  const handleClearSelection = () => {
    setSelectedJobs([]);
  };

  // Bulk operations
  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedJobs.length === 0) return;

    // This would use the bulk mutation hook in a real implementation
    // For now, using the API client directly
    try {
      const result = await apiClient.bulkUpdateJobStatus(selectedJobs, status);
      if (result.error) {
        toast.error(
          typeof result.error === "string" ? result.error : result.error.message
        );
        return;
      }

      toast.success(`Updated ${selectedJobs.length} job applications`);
      setSelectedJobs([]);
      refetchJobs();
      refetchStats();
    } catch (err) {
      toast.error("Failed to update job applications");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedJobs.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedJobs.length} job applications? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const promises = selectedJobs.map((jobId) =>
        deleteJobMutation.mutateAsync(jobId)
      );
      await Promise.all(promises);

      toast.success(`Deleted ${selectedJobs.length} job applications`);
      setSelectedJobs([]);
    } catch (err) {
      toast.error("Failed to delete job applications");
    }
  };

  const handleExport = () => {
    const jobsToExport =
      selectedJobs.length > 0
        ? jobs.filter((job) => selectedJobs.includes(job.id))
        : jobs;

    exportJobs(jobsToExport, "csv");
    toast.success(`Exported ${jobsToExport.length} job applications`);
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleItemsPerPageChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  // Loading and error states
  const isLoading = isLoadingJobs || isLoadingStats;
  const error = jobError || statsError;

  // Memoized filtered jobs for search highlighting
  const displayJobs = useMemo(() => {
    if (!filters.search.trim()) return jobs;

    const searchTerm = filters.search.toLowerCase();
    return jobs.filter(
      (job) =>
        job.jobTitle.toLowerCase().includes(searchTerm) ||
        job.vendorName.toLowerCase().includes(searchTerm) ||
        (job.location && job.location.toLowerCase().includes(searchTerm))
    );
  }, [jobs, filters.search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading job applications...</span>
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
          Failed to Load Jobs
        </h3>
        <p className="text-gray-600 mb-4">
          {error instanceof Error ? error.message : String(error)}
        </p>
        <Button
          onClick={() => {
            refetchJobs();
            refetchStats();
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl font-display font-semibold text-gray-900">
              Job Tracker
            </h2>
            <ConnectionStatusIndicator showText={true} />
          </div>
          <p className="text-gray-600">
            Track your job applications and manage your job search progress.
          </p>
        </div>

        <Button className="button-primary mt-4 md:mt-0" onClick={handleAddJob}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Job
        </Button>
      </div>

      {/* Advanced Filters */}
      <AdvancedJobFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleFiltersReset}
        statusCounts={statusCounts}
        totalJobs={pagination.total}
      />

      {/* Bulk Operations */}
      <BulkOperations
        selectedJobs={selectedJobs}
        allJobs={displayJobs}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkDelete={handleBulkDelete}
        onExport={handleExport}
      />

      {/* Jobs List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading jobs...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {displayJobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                <BriefcaseIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Jobs Found
              </h3>
              <p className="text-gray-600 mb-4">
                {filters.search ||
                filters.location ||
                filters.appliedAfter ||
                filters.appliedBefore
                  ? "Try adjusting your search and filter criteria."
                  : "Start tracking your job applications."}
              </p>
              <div className="flex items-center justify-center gap-2">
                {(filters.search ||
                  filters.location ||
                  filters.appliedAfter ||
                  filters.appliedBefore) && (
                  <Button variant="outline" onClick={handleFiltersReset}>
                    Clear Filters
                  </Button>
                )}
                <Button className="button-primary" onClick={handleAddJob}>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Your First Job
                </Button>
              </div>
            </div>
          ) : (
            displayJobs.map((job, index) => {
              const realtimeUpdate = realTimeUpdates[job.id];
              return (
                <div key={job.id} className="relative">
                  {/* Real-time update indicator */}
                  {realtimeUpdate && (
                    <div className="absolute -top-2 right-4 z-10">
                      <div className="px-2 py-1 bg-green-500 text-white text-xs rounded-full animate-pulse">
                        {realtimeUpdate.action === "created" && "New!"}
                        {realtimeUpdate.action === "updated" && "Updated!"}
                        {realtimeUpdate.action === "deleted" && "Deleted!"}
                        {realtimeUpdate.action.startsWith("status_changed_") &&
                          `Status: ${realtimeUpdate.action.split("_")[2]}`}
                      </div>
                    </div>
                  )}
                  <JobItem
                    job={job}
                    index={index}
                    isSelected={selectedJobs.includes(job.id)}
                    onSelect={handleJobSelect}
                    onView={handleViewJob}
                    onEdit={handleEditJob}
                    onDelete={handleDeleteJob}
                    searchTerm={filters.search}
                  />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Enhanced Pagination */}
      {displayJobs.length > 0 && (
        <EnhancedPagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Modals */}
      <AddJobModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onJobAdded={handleJobAdded}
      />

      <EditJobModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onJobUpdated={handleJobUpdated}
        job={selectedJob}
      />

      <ViewJobModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        onEdit={() => {
          setShowViewModal(false);
          setShowEditModal(true);
        }}
        onDelete={() => selectedJob && handleDeleteJob(selectedJob.id)}
        job={selectedJob}
      />
    </div>
  );
}
