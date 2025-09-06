"use client";

import { toast } from "@/components/ui/Toast";
import { useCallback, useState } from "react";

interface UseRetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number) => void;
  onMaxAttemptsReached?: () => void;
}

interface RetryState {
  attempts: number;
  isRetrying: boolean;
  hasReachedMaxAttempts: boolean;
}

export function useRetry(options: UseRetryOptions = {}) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    onRetry,
    onMaxAttemptsReached,
  } = options;

  const [retryState, setRetryState] = useState<RetryState>({
    attempts: 0,
    isRetrying: false,
    hasReachedMaxAttempts: false,
  });

  const reset = useCallback(() => {
    setRetryState({
      attempts: 0,
      isRetrying: false,
      hasReachedMaxAttempts: false,
    });
  }, []);

  const retry = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      showToast = true
    ): Promise<T | null> => {
      if (retryState.hasReachedMaxAttempts) {
        return null;
      }

      const currentAttempt = retryState.attempts + 1;

      setRetryState((prev) => ({
        ...prev,
        attempts: currentAttempt,
        isRetrying: true,
      }));

      try {
        const result = await asyncFn();

        // Success - reset state
        setRetryState({
          attempts: 0,
          isRetrying: false,
          hasReachedMaxAttempts: false,
        });

        if (showToast && currentAttempt > 1) {
          toast.success("Operation completed successfully");
        }

        return result;
      } catch (error) {
        if (currentAttempt >= maxAttempts) {
          setRetryState((prev) => ({
            ...prev,
            isRetrying: false,
            hasReachedMaxAttempts: true,
          }));

          if (onMaxAttemptsReached) {
            onMaxAttemptsReached();
          }

          if (showToast) {
            toast.error(`Operation failed after ${maxAttempts} attempts`);
          }

          throw error;
        }

        // Calculate delay with exponential backoff if enabled
        const retryDelay = backoff
          ? delay * Math.pow(2, currentAttempt - 1)
          : delay;

        if (showToast) {
          toast.warning(
            `Attempt ${currentAttempt} failed. Retrying in ${Math.round(retryDelay / 1000)}s...`,
            { duration: retryDelay }
          );
        }

        if (onRetry) {
          onRetry(currentAttempt);
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));

        setRetryState((prev) => ({
          ...prev,
          isRetrying: false,
        }));

        // Recursive retry
        return retry(asyncFn, false); // Don't show toast for subsequent attempts
      }
    },
    [retryState, maxAttempts, delay, backoff, onRetry, onMaxAttemptsReached]
  );

  return {
    ...retryState,
    retry,
    reset,
    canRetry: !retryState.hasReachedMaxAttempts,
  };
}

export default useRetry;
