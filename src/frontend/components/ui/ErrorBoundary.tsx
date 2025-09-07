"use client";

import { Button } from "@/components/ui/Button";
import { ExclamationTriangleIcon, HomeIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import React, { Component, ReactNode } from "react";
import { toast } from "react-hot-toast";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showToast?: boolean;
  level?: 'page' | 'component' | 'section';
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
  retryCount: number;
  errorTimestamp?: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
      errorTimestamp: Date.now(),
    };
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange = true } = this.props;
    if (resetOnPropsChange && prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false, error: undefined, errorId: undefined, retryCount: 0 });
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, showToast = true } = this.props;
    
    // Enhanced error logging
    const errorDetails = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      errorInfo,
      errorId: this.state.errorId,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };
    
    console.error("Error caught by boundary:", errorDetails);

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Show toast notification
    if (showToast) {
      toast.error(
        `Something went wrong: ${error.message}`,
        {
          id: this.state.errorId,
          duration: 6000,
        }
      );
    }

    // Report to error monitoring service
    this.reportError(errorDetails);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private reportError = (errorDetails: any) => {
    // In production, send to error monitoring service like Sentry
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Example: window.Sentry?.captureException(errorDetails.error, { extra: errorDetails });
      console.log('Error reported to monitoring service:', errorDetails);
    }
  };

  private handleRetry = () => {
    const { retryCount } = this.state;

    if (retryCount >= this.maxRetries) {
      toast.error('Maximum retry attempts reached. Please refresh the page.');
      return;
    }

    this.setState({ 
      retryCount: retryCount + 1 
    });

    const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
    
    // Add delay before retry
    this.retryTimeoutId = setTimeout(() => {
      this.setState({ 
        hasError: false, 
        error: undefined,
        errorId: undefined 
      });
    }, delay);

    toast.loading(`Retrying in ${delay / 1000}s...`, { duration: delay });
  };

  private handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  private getErrorLevel() {
    return this.props.level || 'component';
  }

  private renderErrorUI() {
    const { fallback } = this.props;
    const { error, retryCount, errorTimestamp } = this.state;
    const level = this.getErrorLevel();
    
    if (fallback) {
      return fallback;
    }

    const isPageLevel = level === 'page';
    const containerClass = isPageLevel 
      ? "min-h-screen flex items-center justify-center px-4"
      : "flex items-center justify-center py-8 px-4";
      
    const maxWidth = isPageLevel ? "max-w-md" : "max-w-sm";

    return (
      <div className={containerClass}>
        <div className={`text-center ${maxWidth}`}>
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
          </div>
          
          <h1 className={`${isPageLevel ? 'text-2xl' : 'text-lg'} font-bold text-gray-900 mb-2`}>
            Something went wrong
          </h1>
          
          <p className="text-gray-600 mb-4 text-sm">
            {level === 'page' 
              ? "We apologize for the inconvenience. The page encountered an unexpected error."
              : "This section encountered an error and couldn't load properly."}
          </p>

          {error && process.env.NODE_ENV === 'development' && (
            <details className="mb-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                {error.message}\n{error.stack}
              </pre>
            </details>
          )}

          {errorTimestamp && (
            <p className="text-xs text-gray-400 mb-4">
              Error ID: {this.state.errorId} • {new Date(errorTimestamp).toLocaleTimeString()}
            </p>
          )}
          
          <div className="space-y-3">
            <div className="flex gap-2 justify-center">
              <Button
                onClick={this.handleRetry}
                disabled={retryCount >= this.maxRetries}
                size="sm"
                leftIcon={<ArrowPathIcon className="w-4 h-4" />}
              >
                {retryCount >= this.maxRetries ? 'Max Retries Reached' : `Retry ${retryCount > 0 ? `(${retryCount}/${this.maxRetries})` : ''}`}
              </Button>
              
              {isPageLevel && (
                <Button
                  variant="secondary"
                  onClick={this.handleRefresh}
                  size="sm"
                >
                  Refresh Page
                </Button>
              )}
            </div>
            
            {isPageLevel && (
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                size="sm"
                leftIcon={<HomeIcon className="w-4 h-4" />}
              >
                Go Home
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
