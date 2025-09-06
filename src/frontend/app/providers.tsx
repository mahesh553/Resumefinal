'use client';

import React from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SessionProvider } from 'next-auth/react';
import { toast } from 'react-hot-toast';

// Enhanced QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except 408, 429
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
            return false;
          }
        }
        // Retry up to 3 times with exponential backoff
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations on client errors
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          if (
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('forbidden') ||
            errorMessage.includes('validation') ||
            errorMessage.includes('invalid')
          ) {
            return false;
          }
        }
        return failureCount < 2;
      },
      retryDelay: 1000,
      onError: (error) => {
        // Global error handling for mutations
        console.error('Mutation error:', error);
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error: Error, query) => {
      // Global error handling for queries
      console.error('Query error:', error, 'Query key:', query.queryKey);
      
      // Show user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('unauthorized')) {
          toast.error('Session expired. Please log in again.');
        } else if (error.message.includes('network')) {
          toast.error('Network error. Please check your connection.');
        } else {
          // Don't show toast for background refetch errors
          if (query.state.fetchStatus !== 'fetching' || query.state.status === 'error') {
            toast.error('Something went wrong. Please try again.');
          }
        }
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: Error) => {
      console.error('Mutation cache error:', error);
    },
  }),
});

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        {children}
      </SessionProvider>
      {/* Only show React Query Devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}