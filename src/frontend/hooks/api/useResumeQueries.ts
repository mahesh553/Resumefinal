import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { toast } from 'react-hot-toast';

// Query Keys
export const resumeKeys = {
  all: ['resumes'] as const,
  lists: () => [...resumeKeys.all, 'list'] as const,
  list: (page: number, limit: number) => [...resumeKeys.lists(), page, limit] as const,
  analysis: (id: string) => [...resumeKeys.all, 'analysis', id] as const,
  versions: (id: string) => [...resumeKeys.all, 'versions', id] as const,
  userStats: () => [...resumeKeys.all, 'stats'] as const,
};

// Resume List Query
export function useResumeList(page = 1, limit = 10) {
  return useQuery({
    queryKey: resumeKeys.list(page, limit),
    queryFn: async () => {
      const result = await apiClient.getUserResumes(page, limit);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (previousData) => previousData,
  });
}

// Resume Analysis Query
export function useResumeAnalysis(analysisId: string, enabled = true) {
  return useQuery({
    queryKey: resumeKeys.analysis(analysisId),
    queryFn: async () => {
      const result = await apiClient.getAnalysis(analysisId);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!analysisId && enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: (failureCount, error) => {
      // Retry up to 3 times for processing status
      return failureCount < 3 && error.message.includes('processing');
    },
    refetchInterval: (query) => {
      // Poll every 5 seconds if still processing
      return query.state.data?.status === 'processing' ? 5000 : false;
    },
  });
}

// Resume Versions Query
export function useResumeVersions(resumeId: string) {
  return useQuery({
    queryKey: resumeKeys.versions(resumeId),
    queryFn: async () => {
      const result = await apiClient.getResumeVersions(resumeId);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!resumeId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// User Stats Query
export function useUserStats() {
  return useQuery({
    queryKey: resumeKeys.userStats(),
    queryFn: async () => {
      const result = await apiClient.getUserStats();
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Resume Upload Mutation
export function useResumeUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (progress: number) => void;
    }) => {
      const result = await apiClient.uploadResume(file, onProgress);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      toast.success('Resume uploaded successfully!');
      // Invalidate and refetch resumes
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: resumeKeys.userStats() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload resume');
    },
  });
}

// Bulk Upload Mutation
export function useBulkResumeUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      const result = await apiClient.bulkUploadResumes(files);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      if (data) {
        toast.success(`${data.totalFiles} resumes uploaded successfully!`);
      }
      // Invalidate and refetch resumes
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: resumeKeys.userStats() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload resumes');
    },
  });
}

// Create Resume Version Mutation
export function useCreateResumeVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resumeId,
      changes,
    }: {
      resumeId: string;
      changes: any;
    }) => {
      const result = await apiClient.createResumeVersion(resumeId, changes);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      toast.success('Resume version created successfully!');
      queryClient.invalidateQueries({
        queryKey: resumeKeys.versions(variables.resumeId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create resume version');
    },
  });
}

// Restore Resume Version Mutation
export function useRestoreResumeVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resumeId,
      versionId,
    }: {
      resumeId: string;
      versionId: string;
    }) => {
      const result = await apiClient.restoreResumeVersion(resumeId, versionId);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      toast.success('Resume version restored successfully!');
      queryClient.invalidateQueries({
        queryKey: resumeKeys.versions(variables.resumeId),
      });
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore resume version');
    },
  });
}