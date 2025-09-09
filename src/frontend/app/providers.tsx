"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "next-auth/react";
import React, { useEffect } from "react";
import { toast } from "react-hot-toast";
import { WebSocketProvider } from "../components/providers/WebSocketProvider";
import { NetworkProvider } from "../components/ui/NetworkStatus";
import { ErrorReportingProvider } from "../lib/errorReporting";

// Enhanced QueryClient configuration with comprehensive error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except 408, 429
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          if (
            errorMessage.includes("unauthorized") ||
            errorMessage.includes("forbidden")
          ) {
            return false;
          }
          if (
            errorMessage.includes("validation") ||
            errorMessage.includes("invalid")
          ) {
            return false;
          }
          // Don't retry on client errors
          if (errorMessage.includes("400") || errorMessage.includes("404")) {
            return false;
          }
        }
        // Retry up to 3 times with exponential backoff for retryable errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      // Network mode for offline handling
      networkMode: "offlineFirst",
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations on client errors
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          if (
            errorMessage.includes("unauthorized") ||
            errorMessage.includes("forbidden") ||
            errorMessage.includes("validation") ||
            errorMessage.includes("invalid") ||
            errorMessage.includes("400") ||
            errorMessage.includes("404")
          ) {
            return false;
          }
        }
        // Retry only server errors, max 2 attempts
        return failureCount < 2;
      },
      retryDelay: 1000,
      networkMode: "offlineFirst",
      onError: (error) => {
        // Global error handling for mutations
        console.error("Mutation error:", error);
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error: Error, query) => {
      // Global error handling for queries
      console.error("Query error:", error, "Query key:", query.queryKey);

      // Show user-friendly error messages based on error type
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("session expired") ||
          errorMessage.includes("authentication required")
        ) {
          // Don't show toast immediately, the auth redirect will handle it
          console.log(
            "Authentication error detected, user will be redirected to login"
          );
        } else if (
          errorMessage.includes("network") ||
          errorMessage.includes("fetch")
        ) {
          toast.error("Network error. Please check your connection.", {
            id: "network-error",
            duration: 6000,
          });
        } else if (errorMessage.includes("timeout")) {
          toast.error("Request timed out. Please try again.", {
            id: "timeout-error",
            duration: 4000,
          });
        } else if (errorMessage.includes("rate limit")) {
          toast.error("Too many requests. Please wait a moment.", {
            id: "rate-limit-error",
            duration: 5000,
          });
        } else {
          // Don't show toast for background refetch errors or successful queries
          if (
            query.state.fetchStatus !== "fetching" ||
            query.state.status === "error"
          ) {
            toast.error("Something went wrong. Please try again.", {
              duration: 4000,
            });
          }
        }
      }
    },
    onSuccess: (data, query) => {
      // Optional: Log successful queries in development
      if (process.env.NODE_ENV === "development") {
        console.log("Query success:", query.queryKey, data);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: Error, variables, context, mutation) => {
      console.error("Mutation cache error:", error, {
        variables,
        context,
        mutationKey: mutation.options.mutationKey,
      });
    },
    onSuccess: (data, variables, context, mutation) => {
      // Optional: Log successful mutations in development
      if (process.env.NODE_ENV === "development") {
        console.log("Mutation success:", mutation.options.mutationKey, data);
      }
    },
  }),
});

// Visibility change handler to pause queries when tab is hidden
function setupVisibilityHandler(queryClient: QueryClient) {
  if (typeof window === "undefined") return;

  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Pause queries when tab is hidden
      queryClient
        .getQueryCache()
        .getAll()
        .forEach((query) => {
          queryClient.cancelQueries({ queryKey: query.queryKey });
        });
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Setup visibility handler on mount
  useEffect(() => {
    const cleanup = setupVisibilityHandler(queryClient);
    return cleanup;
  }, []);

  return (
    <ErrorReportingProvider
      config={{
        enableReporting: process.env.NODE_ENV === "production",
        reportingEndpoint: process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT,
      }}
    >
      <NetworkProvider showNotifications={true} monitorSlowConnection={true}>
        <QueryClientProvider client={queryClient}>
          <SessionProvider
            refetchInterval={0}
            refetchOnWindowFocus={false}
            refetchWhenOffline={false}
          >
            <WebSocketProvider autoConnect={true} showNotifications={true}>
              {children}
            </WebSocketProvider>
          </SessionProvider>
          {/* React Query Devtools temporarily disabled */}
          {/* {process.env.NODE_ENV === "development" && (
            <ReactQueryDevtools initialIsOpen={false} />
          )} */}
        </QueryClientProvider>
      </NetworkProvider>
    </ErrorReportingProvider>
  );
}
