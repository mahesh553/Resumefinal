"use client";

import { ApiError } from "@/lib/api";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
} from "react";

// Error reporting configuration
interface ErrorReportingConfig {
  enableReporting: boolean;
  enableConsoleLogging: boolean;
  enableLocalStorage: boolean;
  maxStoredErrors: number;
  reportingEndpoint?: string;
  userId?: string;
  sessionId: string;
  environment: "development" | "staging" | "production";
}

// Error report structure
interface ErrorReport {
  id: string;
  timestamp: string;
  level: "error" | "warning" | "info";
  category: "api" | "ui" | "network" | "auth" | "validation" | "unknown";
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId: string;
  url: string;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  metadata?: {
    component?: string;
    action?: string;
    tags?: string[];
    severity?: "low" | "medium" | "high" | "critical";
  };
}

// Error reporting context
interface ErrorReportingContextType {
  reportError: (
    error: Error | ApiError | string,
    context?: Partial<ErrorReport>
  ) => void;
  reportWarning: (message: string, context?: Partial<ErrorReport>) => void;
  reportInfo: (message: string, context?: Partial<ErrorReport>) => void;
  getStoredErrors: () => ErrorReport[];
  clearStoredErrors: () => void;
  config: ErrorReportingConfig;
}

const ErrorReportingContext = createContext<ErrorReportingContextType | null>(
  null
);

export function useErrorReporting() {
  const context = useContext(ErrorReportingContext);
  if (!context) {
    throw new Error(
      "useErrorReporting must be used within an ErrorReportingProvider"
    );
  }
  return context;
}

// Error reporting provider
interface ErrorReportingProviderProps {
  children: React.ReactNode;
  config?: Partial<ErrorReportingConfig>;
}

export function ErrorReportingProvider({
  children,
  config: userConfig = {},
}: ErrorReportingProviderProps) {
  const config: ErrorReportingConfig = {
    enableReporting: process.env.NODE_ENV === "production",
    enableConsoleLogging: true,
    enableLocalStorage: true,
    maxStoredErrors: 100,
    sessionId: generateSessionId(),
    environment: (process.env.NODE_ENV as any) || "development",
    ...userConfig,
  };

  // Generate unique session ID
  function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate unique error ID
  const generateErrorId = useCallback((): string => {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Categorize error based on content
  const categorizeError = useCallback(
    (error: Error | ApiError | string): ErrorReport["category"] => {
      const errorMessage = typeof error === "string" ? error : error.message;
      const errorLower = errorMessage.toLowerCase();

      if (
        errorLower.includes("network") ||
        errorLower.includes("fetch") ||
        errorLower.includes("connection")
      ) {
        return "network";
      }
      if (
        errorLower.includes("unauthorized") ||
        errorLower.includes("forbidden") ||
        errorLower.includes("auth")
      ) {
        return "auth";
      }
      if (
        errorLower.includes("validation") ||
        errorLower.includes("invalid") ||
        errorLower.includes("required")
      ) {
        return "validation";
      }
      if (typeof error === "object" && error !== null && "code" in error) {
        return "api";
      }
      return "ui";
    },
    []
  );

  // Create error report
  const createErrorReport = useCallback(
    (
      error: Error | ApiError | string,
      level: ErrorReport["level"],
      context: Partial<ErrorReport> = {}
    ): ErrorReport => {
      const message = typeof error === "string" ? error : error.message;
      const stack = error instanceof Error ? error.stack : undefined;

      return {
        id: generateErrorId(),
        timestamp: new Date().toISOString(),
        level,
        category: context.category || categorizeError(error),
        message,
        stack,
        context: context.context,
        userId: config.userId || context.userId,
        sessionId: config.sessionId,
        url: typeof window !== "undefined" ? window.location.href : "",
        userAgent:
          typeof window !== "undefined" ? window.navigator.userAgent : "",
        viewport:
          typeof window !== "undefined"
            ? { width: window.innerWidth, height: window.innerHeight }
            : { width: 0, height: 0 },
        metadata: {
          severity:
            level === "error" ? "high" : level === "warning" ? "medium" : "low",
          ...context.metadata,
        },
        ...context,
      };
    },
    [config.userId, config.sessionId, generateErrorId, categorizeError]
  );

  // Store error locally
  const storeErrorLocally = useCallback(
    (report: ErrorReport) => {
      if (!config.enableLocalStorage || typeof window === "undefined") return;

      try {
        const storageKey = "qoder_error_reports";
        const stored = localStorage.getItem(storageKey);
        const errors: ErrorReport[] = stored ? JSON.parse(stored) : [];

        // Add new error
        errors.unshift(report);

        // Keep only the latest maxStoredErrors
        const trimmedErrors = errors.slice(0, config.maxStoredErrors);

        localStorage.setItem(storageKey, JSON.stringify(trimmedErrors));
      } catch (storageError) {
        console.warn("Failed to store error report locally:", storageError);
      }
    },
    [config.enableLocalStorage, config.maxStoredErrors]
  );

  // Send error to reporting service
  const sendErrorReport = useCallback(
    async (report: ErrorReport) => {
      if (!config.enableReporting || !config.reportingEndpoint) return;

      try {
        await fetch(config.reportingEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(report),
        });
      } catch (reportingError) {
        console.warn("Failed to send error report:", reportingError);
        // Store locally as fallback
        storeErrorLocally(report);
      }
    },
    [config.enableReporting, config.reportingEndpoint, storeErrorLocally]
  );

  // Log error to console
  const logErrorToConsole = useCallback(
    (report: ErrorReport) => {
      if (!config.enableConsoleLogging) return;

      const logMethod =
        report.level === "error"
          ? console.error
          : report.level === "warning"
            ? console.warn
            : console.info;

      logMethod(
        `[${report.level.toUpperCase()}] ${report.category}:`,
        report.message,
        {
          id: report.id,
          timestamp: report.timestamp,
          context: report.context,
          metadata: report.metadata,
          stack: report.stack,
        }
      );
    },
    [config.enableConsoleLogging]
  );

  // Main error reporting function
  const reportError = useCallback(
    (error: Error | ApiError | string, context: Partial<ErrorReport> = {}) => {
      const report = createErrorReport(error, "error", context);

      logErrorToConsole(report);
      storeErrorLocally(report);
      sendErrorReport(report);
    },
    [createErrorReport, logErrorToConsole, storeErrorLocally, sendErrorReport]
  );

  // Warning reporting function
  const reportWarning = useCallback(
    (message: string, context: Partial<ErrorReport> = {}) => {
      const report = createErrorReport(message, "warning", context);

      logErrorToConsole(report);
      storeErrorLocally(report);
      sendErrorReport(report);
    },
    [createErrorReport, logErrorToConsole, storeErrorLocally, sendErrorReport]
  );

  // Info reporting function
  const reportInfo = useCallback(
    (message: string, context: Partial<ErrorReport> = {}) => {
      const report = createErrorReport(message, "info", context);

      logErrorToConsole(report);
      storeErrorLocally(report);
      sendErrorReport(report);
    },
    [createErrorReport, logErrorToConsole, storeErrorLocally, sendErrorReport]
  );

  // Get stored errors from localStorage
  const getStoredErrors = useCallback((): ErrorReport[] => {
    if (!config.enableLocalStorage || typeof window === "undefined") return [];

    try {
      const storageKey = "qoder_error_reports";
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [config.enableLocalStorage]);

  // Clear stored errors
  const clearStoredErrors = useCallback(() => {
    if (!config.enableLocalStorage || typeof window === "undefined") return;

    try {
      const storageKey = "qoder_error_reports";
      localStorage.removeItem(storageKey);
    } catch (clearError) {
      console.warn("Failed to clear stored errors:", clearError);
    }
  }, [config.enableLocalStorage]);

  // Set up global error handlers
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Handle unhandled JavaScript errors
    const handleGlobalError = (event: ErrorEvent) => {
      reportError(event.error || event.message, {
        category: "ui",
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        metadata: {
          component: "global",
          action: "unhandled_error",
          severity: "high",
        },
      });
    };

    // Handle unhandled promise rejections
    const handleGlobalRejection = (event: PromiseRejectionEvent) => {
      reportError(event.reason, {
        category: "api",
        context: {
          type: "unhandled_promise_rejection",
        },
        metadata: {
          component: "global",
          action: "promise_rejection",
          severity: "high",
        },
      });
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleGlobalRejection);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleGlobalRejection);
    };
  }, [reportError]);

  const value: ErrorReportingContextType = {
    reportError,
    reportWarning,
    reportInfo,
    getStoredErrors,
    clearStoredErrors,
    config,
  };

  return (
    <ErrorReportingContext.Provider value={value}>
      {children}
    </ErrorReportingContext.Provider>
  );
}

// Error boundary with reporting
interface ErrorBoundaryWithReportingProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function ErrorBoundaryWithReporting({
  children,
  fallback: Fallback,
  onError,
}: ErrorBoundaryWithReportingProps) {
  const { reportError } = useErrorReporting();

  const handleError = useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      reportError(error, {
        category: "ui",
        context: {
          errorInfo,
          componentStack: errorInfo.componentStack,
        },
        metadata: {
          component: "error_boundary",
          action: "component_error",
          severity: "high",
        },
      });

      onError?.(error, errorInfo);
    },
    [reportError, onError]
  );

  return (
    <ErrorBoundary onError={handleError} fallback={Fallback}>
      {children}
    </ErrorBoundary>
  );
}

// Simple error boundary implementation
class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return (
          <Fallback
            error={this.state.error}
            resetError={() =>
              this.setState({ hasError: false, error: undefined })
            }
          />
        );
      }

      return (
        <div className="error-boundary-fallback">
          <h2>Something went wrong.</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error.stack}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for component-level error reporting
export function useComponentErrorReporting(componentName: string) {
  const { reportError, reportWarning } = useErrorReporting();

  const reportComponentError = useCallback(
    (error: Error | string, action?: string, context?: Record<string, any>) => {
      reportError(error, {
        metadata: {
          component: componentName,
          action,
          severity: "medium",
        },
        context,
      });
    },
    [reportError, componentName]
  );

  const reportComponentWarning = useCallback(
    (message: string, action?: string, context?: Record<string, any>) => {
      reportWarning(message, {
        metadata: {
          component: componentName,
          action,
          severity: "low",
        },
        context,
      });
    },
    [reportWarning, componentName]
  );

  return {
    reportComponentError,
    reportComponentWarning,
  };
}

// Export types
export type { ErrorReport, ErrorReportingConfig };
