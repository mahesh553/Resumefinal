import { apiClient } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

// Query Keys
export const jdMatchingKeys = {
  all: ["jd-matching"] as const,
  results: (id: string) => [...jdMatchingKeys.all, "results", id] as const,
};

// JD Matching Results Query
export function useJDMatchingResults(matchingId: string, enabled = true) {
  return useQuery({
    queryKey: jdMatchingKeys.results(matchingId),
    queryFn: async () => {
      const result = await apiClient.getMatchingResults(matchingId);
      if (result.error) {
        throw new Error(
          typeof result.error === "string" ? result.error : result.error.message
        );
      }
      return result.data;
    },
    enabled: !!matchingId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Retry up to 3 times for processing status
      return failureCount < 3 && error.message.includes("processing");
    },
    refetchInterval: (query) => {
      // Poll every 10 seconds if still processing
      return query.state.data?.status === "processing" ? 10000 : false;
    },
  });
}

// Analyze Job Match Mutation
export function useAnalyzeJobMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resumeId,
      jobDescription,
      useSemanticMatching = true,
    }: {
      resumeId: string;
      jobDescription: string;
      useSemanticMatching?: boolean;
    }) => {
      const result = await apiClient.analyzeJobMatch({
        resumeId,
        jobDescription,
        useSemanticMatching,
      });
      if (result.error) {
        throw new Error(
          typeof result.error === "string" ? result.error : result.error.message
        );
      }
      return result.data;
    },
    onSuccess: (data) => {
      toast.success("Job matching analysis started successfully!");
      // The result will be polled by useJDMatchingResults
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to start job matching analysis");
    },
  });
}

// Health Check Query
export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const result = await apiClient.healthCheck();
      if (result.error) {
        throw new Error(
          typeof result.error === "string" ? result.error : result.error.message
        );
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
