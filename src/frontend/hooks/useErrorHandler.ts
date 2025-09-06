"use client";

import { toast } from "@/components/ui/Toast";
import { useCallback, useState } from "react";

interface UseErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  onError?: (error: Error) => void;
}

interface ErrorState {
  error: Error | null;
  isError: boolean;
  errorMessage: string | null;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { showToast = true, logError = true, onError } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    errorMessage: null,
  });

  const handleError = useCallback(
    (error: Error | string, context?: string) => {
      const errorObj = typeof error === "string" ? new Error(error) : error;
      const message = errorObj.message || "An unexpected error occurred";

      // Update error state
      setErrorState({
        error: errorObj,
        isError: true,
        errorMessage: message,
      });

      // Log error if enabled
      if (logError) {
        console.error(`Error${context ? ` in ${context}` : ""}:`, errorObj);
      }

      // Show toast notification if enabled
      if (showToast) {
        toast.error(message, {
          title: context || "Error",
        });
      }

      // Call custom error handler if provided
      if (onError) {
        onError(errorObj);
      }
    },
    [showToast, logError, onError]
  );

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      errorMessage: null,
    });
  }, []);

  const handleAsyncError = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      context?: string
    ): Promise<T | null> => {
      try {
        clearError();
        return await asyncFn();
      } catch (error) {
        handleError(error as Error, context);
        return null;
      }
    },
    [handleError, clearError]
  );

  return {
    ...errorState,
    handleError,
    clearError,
    handleAsyncError,
  };
}

// Generic API error handler
export function handleApiError(error: any, context?: string): string {
  let message = "An unexpected error occurred";

  if (error?.response?.data?.message) {
    message = error.response.data.message;
  } else if (error?.message) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }

  // Log the error
  console.error(`API Error${context ? ` in ${context}` : ""}:`, error);

  return message;
}

// Network error checker
export function isNetworkError(error: any): boolean {
  return (
    !error.response &&
    (error.code === "NETWORK_ERROR" ||
      error.message?.includes("Network Error") ||
      error.message?.includes("fetch"))
  );
}

// Timeout error checker
export function isTimeoutError(error: any): boolean {
  return error.code === "ECONNABORTED" || error.message?.includes("timeout");
}

// Auth error checker
export function isAuthError(error: any): boolean {
  return (
    error?.response?.status === 401 ||
    error?.response?.status === 403 ||
    error?.response?.data?.message?.includes("Unauthorized") ||
    error?.response?.data?.message?.includes("Forbidden")
  );
}

export default useErrorHandler;
