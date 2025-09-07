import { apiClient } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

// Query Keys
export const jobKeys = {
  all: ["jobs"] as const,
  lists: () => [...jobKeys.all, "list"] as const,
  list: (filters: any) => [...jobKeys.lists(), filters] as const,
  detail: (id: string) => [...jobKeys.all, "detail", id] as const,
  stats: () => [...jobKeys.all, "stats"] as const,
};

// Job List Query with Filters
export function useJobList(
  filters: {
    status?: string;
    vendorName?: string;
    location?: string;
    appliedAfter?: string;
    appliedBefore?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  } = {}
) {
  return useQuery({
    queryKey: jobKeys.list(filters),
    queryFn: async () => {
      const result = await apiClient.getJobs(filters);
      if (result.error) {
        throw new Error(
          typeof result.error === "string" ? result.error : result.error.message
        );
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
}

// Job Detail Query
export function useJobDetail(jobId: string) {
  return useQuery({
    queryKey: jobKeys.detail(jobId),
    queryFn: async () => {
      const result = await apiClient.getJob(jobId);
      if (result.error) {
        throw new Error(
          typeof result.error === "string" ? result.error : result.error.message
        );
      }
      return result.data;
    },
    enabled: !!jobId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Job Stats Query
export function useJobStats() {
  return useQuery({
    queryKey: jobKeys.stats(),
    queryFn: async () => {
      const result = await apiClient.getJobStats();
      if (result.error) {
        throw new Error(
          typeof result.error === "string" ? result.error : result.error.message
        );
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Create Job Mutation
export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobData: {
      vendorName: string;
      jobTitle: string;
      jobDescription?: string;
      applicationUrl?: string;
      salaryRange?: string;
      location?: string;
      appliedDate: string;
      followUpDate?: string;
      interviewDate?: string;
      notes?: string;
      contactEmail?: string;
      contactPhone?: string;
    }) => {
      const result = await apiClient.createJob(jobData);
      if (result.error) {
        throw new Error(
          typeof result.error === "string" ? result.error : result.error.message
        );
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Job application added successfully!");
      // Invalidate job lists and stats
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      queryClient.invalidateQueries({ queryKey: jobKeys.stats() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add job application");
    },
  });
}

// Update Job Mutation with Optimistic Updates
export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      updates,
    }: {
      jobId: string;
      updates: Partial<any>;
    }) => {
      const result = await apiClient.updateJob(jobId, updates);
      if (result.error) {
        throw new Error(
          typeof result.error === "string" ? result.error : result.error.message
        );
      }
      return result.data;
    },
    // Optimistic update
    onMutate: async ({ jobId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: jobKeys.all });

      // Snapshot the previous value
      const previousJob = queryClient.getQueryData(jobKeys.detail(jobId));
      const previousJobLists = queryClient.getQueriesData({
        queryKey: jobKeys.lists(),
      });

      // Optimistically update job detail
      queryClient.setQueryData(jobKeys.detail(jobId), (old: any) => {
        if (old) {
          return { ...old, ...updates };
        }
        return old;
      });

      // Optimistically update job in all list queries
      previousJobLists.forEach(([queryKey, data]) => {
        if (data && (data as any)?.data) {
          queryClient.setQueryData(queryKey, (oldData: any) => {
            return {
              ...oldData,
              data: oldData.data.map((job: any) =>
                job.id === jobId ? { ...job, ...updates } : job
              ),
            };
          });
        }
      });

      // Return a context with the previous values
      return { previousJob, previousJobLists };
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousJob) {
        queryClient.setQueryData(
          jobKeys.detail(variables.jobId),
          context.previousJob
        );
      }

      if (context?.previousJobLists) {
        context.previousJobLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast.error(err.message || "Failed to update job application");
    },
    onSuccess: (data, variables) => {
      toast.success("Job application updated successfully!");
    },
    onSettled: () => {
      // Always refetch stats after error or success
      queryClient.invalidateQueries({ queryKey: jobKeys.stats() });
    },
  });
}

// Update Job Status Mutation with Optimistic Updates
export function useUpdateJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      status,
    }: {
      jobId: string;
      status: string;
    }) => {
      const result = await apiClient.updateJobStatus(jobId, status);
      if (result.error) {
        throw new Error(
          typeof result.error === "string" ? result.error : result.error.message
        );
      }
      return result.data;
    },
    // Optimistic update
    onMutate: async ({ jobId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: jobKeys.all });

      // Snapshot the previous value
      const previousJob = queryClient.getQueryData(jobKeys.detail(jobId));
      const previousJobLists = queryClient.getQueriesData({
        queryKey: jobKeys.lists(),
      });

      // Optimistically update job detail
      queryClient.setQueryData(jobKeys.detail(jobId), (old: any) => {
        if (old) {
          return { ...old, status };
        }
        return old;
      });

      // Optimistically update job in all list queries
      previousJobLists.forEach(([queryKey, data]) => {
        if (data && (data as any)?.data) {
          queryClient.setQueryData(queryKey, (oldData: any) => {
            return {
              ...oldData,
              data: oldData.data.map((job: any) =>
                job.id === jobId ? { ...job, status } : job
              ),
            };
          });
        }
      });

      // Return a context with the previous values
      return { previousJob, previousJobLists };
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousJob) {
        queryClient.setQueryData(
          jobKeys.detail(variables.jobId),
          context.previousJob
        );
      }

      if (context?.previousJobLists) {
        context.previousJobLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast.error(err.message || "Failed to update job status");
    },
    onSuccess: (data, variables) => {
      toast.success("Job status updated successfully!");
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have correct data
      queryClient.invalidateQueries({ queryKey: jobKeys.stats() });
    },
  });
}

// Bulk Update Job Status Mutation
export function useBulkUpdateJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobIds,
      status,
    }: {
      jobIds: string[];
      status: string;
    }) => {
      const result = await apiClient.bulkUpdateJobStatus(jobIds, status);
      if (result.error) {
        throw new Error(
          typeof result.error === "string" ? result.error : result.error.message
        );
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      toast.success(`${variables.jobIds.length} job(s) updated successfully!`);
      // Invalidate all job-related queries
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update job applications");
    },
  });
}

// Delete Job Mutation
export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const result = await apiClient.deleteJob(jobId);
      if (result.error) {
        throw new Error(
          typeof result.error === "string" ? result.error : result.error.message
        );
      }
      return result.data;
    },
    onSuccess: (data, jobId) => {
      toast.success("Job application deleted successfully!");
      // Remove job from cache
      queryClient.removeQueries({ queryKey: jobKeys.detail(jobId) });
      // Invalidate job lists and stats
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      queryClient.invalidateQueries({ queryKey: jobKeys.stats() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete job application");
    },
  });
}
