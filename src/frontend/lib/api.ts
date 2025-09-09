import { getSession } from "next-auth/react";
import { toast } from "react-hot-toast";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002/api";

// Enhanced error types
export interface ApiError {
  code: string;
  message: string;
  statusCode?: number;
  details?: any;
  retryable?: boolean;
  timestamp?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string | ApiError;
  message?: string;
  success?: boolean;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

export interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: ApiError) => boolean;
}

export interface RequestConfig extends RequestInit {
  retry?: RetryConfig;
  timeout?: number;
  skipErrorToast?: boolean;
}

class EnhancedApiClient {
  private baseURL: string;
  private defaultTimeout = 30000; // 30 seconds
  private networkRetryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    retryCondition: (error) => error.retryable || false,
  };

  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const session = await getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Check for session errors first
      if (session?.error) {
        console.warn("Session has error:", session.error);
        // Don't include auth header if session has errors
        return headers;
      }

      if (session?.accessToken) {
        headers.Authorization = `Bearer ${session.accessToken}`;
      }

      return headers;
    } catch (error) {
      console.error("Error getting session:", error);
      return {
        "Content-Type": "application/json",
      };
    }
  }

  private isNetworkError(error: any): boolean {
    return (
      error instanceof TypeError &&
      (error.message.includes("fetch") ||
        error.message.includes("network") ||
        error.message.includes("Failed to fetch"))
    );
  }

  private isRetryableError(error: ApiError): boolean {
    if (error.retryable !== undefined) {
      return error.retryable;
    }

    // Retry on server errors (5xx) and specific client errors
    if (error.statusCode) {
      return (
        error.statusCode >= 500 ||
        error.statusCode === 408 || // Request Timeout
        error.statusCode === 429 || // Too Many Requests
        error.statusCode === 0 // Network error
      );
    }

    return false;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private createTimeoutController(timeout: number): {
    controller: AbortController;
    timeoutId: NodeJS.Timeout;
  } {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    return { controller, timeoutId };
  }

  private parseError(error: any, response?: Response): ApiError {
    // Network/timeout errors
    if (this.isNetworkError(error)) {
      return {
        code: "NETWORK_ERROR",
        message:
          "Network connection failed. Please check your internet connection.",
        retryable: true,
        timestamp: new Date().toISOString(),
      };
    }

    // Abort/timeout errors
    if (error.name === "AbortError") {
      return {
        code: "TIMEOUT_ERROR",
        message: "Request timed out. Please try again.",
        retryable: true,
        timestamp: new Date().toISOString(),
      };
    }

    // HTTP errors with response
    if (response) {
      const statusCode = response.status;
      let message = `HTTP ${statusCode}: ${response.statusText}`;
      let code = "HTTP_ERROR";
      let retryable = false;

      switch (statusCode) {
        case 401:
          code = "UNAUTHORIZED";
          message = "Session expired. Please log in again.";
          break;
        case 403:
          code = "FORBIDDEN";
          message = "You do not have permission to perform this action.";
          break;
        case 404:
          code = "NOT_FOUND";
          message = "The requested resource was not found.";
          break;
        case 408:
          code = "REQUEST_TIMEOUT";
          message = "Request timed out. Please try again.";
          retryable = true;
          break;
        case 429:
          code = "RATE_LIMITED";
          message = "Too many requests. Please wait a moment and try again.";
          retryable = true;
          break;
        case 500:
          code = "INTERNAL_SERVER_ERROR";
          message = "Internal server error. Please try again later.";
          retryable = true;
          break;
        case 502:
        case 503:
        case 504:
          code = "SERVICE_UNAVAILABLE";
          message = "Service temporarily unavailable. Please try again later.";
          retryable = true;
          break;
      }

      return {
        code,
        message,
        statusCode,
        retryable,
        timestamp: new Date().toISOString(),
      };
    }

    // Generic error fallback
    return {
      code: "UNKNOWN_ERROR",
      message: error.message || "An unexpected error occurred.",
      retryable: false,
      timestamp: new Date().toISOString(),
    };
  }

  private async requestWithRetry<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      retry = this.networkRetryConfig,
      timeout = this.defaultTimeout,
      skipErrorToast = false,
      ...requestInit
    } = config;

    let lastError: ApiError | undefined;
    let attempt = 0;

    while (attempt <= (retry.maxRetries || 0)) {
      try {
        const headers = await this.getAuthHeaders();
        const { controller, timeoutId } = this.createTimeoutController(timeout);

        const requestConfig: RequestInit = {
          ...requestInit,
          headers: {
            ...headers,
            ...requestInit.headers,
          },
          signal: controller.signal,
        };

        const response = await fetch(
          `${this.baseURL}${endpoint}`,
          requestConfig
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const apiError = this.parseError(errorData, response);

          // Add server error details if available
          if (errorData.error || errorData.message) {
            apiError.message =
              errorData.error || errorData.message || apiError.message;
            apiError.details = errorData;
          }

          throw apiError;
        }

        const data = await response.json();
        return { data, success: true };
      } catch (error) {
        const apiError =
          error instanceof Error && "code" in error
            ? (error as ApiError)
            : this.parseError(error);

        lastError = apiError;

        // Check if we should retry
        if (
          attempt < (retry.maxRetries || 0) &&
          this.isRetryableError(apiError)
        ) {
          attempt++;
          const delay = (retry.retryDelay || 1000) * Math.pow(2, attempt - 1);
          await this.delay(delay);
          continue;
        }

        break;
      }
    }

    // Handle final error
    if (lastError && !skipErrorToast) {
      this.showErrorToast(lastError);
    }

    return {
      error: lastError || {
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred",
        timestamp: new Date().toISOString(),
      },
      success: false,
    };
  }

  private showErrorToast(error: ApiError): void {
    switch (error.code) {
      case "NETWORK_ERROR":
        toast.error("Network connection failed", {
          id: "network-error",
          duration: 6000,
        });
        break;
      case "TIMEOUT_ERROR":
        toast.error("Request timed out", {
          id: "timeout-error",
          duration: 4000,
        });
        break;
      case "UNAUTHORIZED":
        toast.error("Please log in again", {
          id: "auth-error",
          duration: 5000,
        });
        break;
      case "RATE_LIMITED":
        toast.error("Too many requests. Please wait a moment.", {
          id: "rate-limit-error",
          duration: 5000,
        });
        break;
      default:
        toast.error(error.message, {
          duration: 4000,
        });
    }
  }

  // Enhanced request method
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.requestWithRetry<T>(endpoint, config);
  }

  // Resume Analysis Endpoints with enhanced error handling
  async uploadResume(
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<ApiResponse<{ id: string; status: string; message: string }>> {
    try {
      const session = await getSession();
      if (!session?.accessToken) {
        const error: ApiError = {
          code: "UNAUTHORIZED",
          message: "Authentication required",
          retryable: false,
        };
        return { error, success: false };
      }

      // Validate file before upload
      if (!file) {
        const error: ApiError = {
          code: "VALIDATION_ERROR",
          message: "No file selected",
          retryable: false,
        };
        return { error, success: false };
      }

      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        const error: ApiError = {
          code: "FILE_TOO_LARGE",
          message: "File size must be less than 10MB",
          retryable: false,
        };
        return { error, success: false };
      }

      // Check file type
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
      ];
      if (!allowedTypes.includes(file.type)) {
        const error: ApiError = {
          code: "INVALID_FILE_TYPE",
          message: "Only PDF, DOCX, DOC, and TXT files are allowed",
          retryable: false,
        };
        return { error, success: false };
      }

      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      const timeout = 120000; // 2 minutes for file upload

      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          xhr.abort();
          resolve({
            error: {
              code: "UPLOAD_TIMEOUT",
              message: "Upload timed out. Please try again.",
              retryable: true,
            },
            success: false,
          });
        }, timeout);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        };

        xhr.onload = () => {
          clearTimeout(timeoutId);
          if (xhr.status === 201) {
            const data = JSON.parse(xhr.responseText);
            resolve({ data, success: true });
          } else {
            const errorData = JSON.parse(xhr.responseText || "{}");
            resolve({
              error: {
                code: "UPLOAD_FAILED",
                message: errorData.error || "Upload failed",
                statusCode: xhr.status,
                retryable: xhr.status >= 500,
              },
              success: false,
            });
          }
        };

        xhr.onerror = () => {
          clearTimeout(timeoutId);
          resolve({
            error: {
              code: "UPLOAD_NETWORK_ERROR",
              message: "Upload failed - network error",
              retryable: true,
            },
            success: false,
          });
        };

        xhr.onabort = () => {
          clearTimeout(timeoutId);
          resolve({
            error: {
              code: "UPLOAD_CANCELLED",
              message: "Upload was cancelled",
              retryable: false,
            },
            success: false,
          });
        };

        xhr.open("POST", `${this.baseURL}/resume/upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${session.accessToken}`);
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Upload error:", error);
      return {
        error: {
          code: "UPLOAD_ERROR",
          message: "Upload failed",
          retryable: true,
        },
        success: false,
      };
    }
  }

  // Enhanced methods with better error handling
  async getAnalysis(analysisId: string): Promise<ApiResponse<any>> {
    return this.request(`/resume/analysis/${analysisId}`, {
      retry: { maxRetries: 2, retryDelay: 1000 },
    });
  }

  async getUserResumes(
    page = 1,
    limit = 10
  ): Promise<
    ApiResponse<{
      resumes: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
  > {
    return this.request(`/resume/list?page=${page}&limit=${limit}`, {
      timeout: 15000,
      retry: { maxRetries: 2 },
    });
  }

  async bulkUploadResumes(files: File[]): Promise<
    ApiResponse<{
      batchId: string;
      totalFiles: number;
      message: string;
      status: string;
    }>
  > {
    const session = await getSession();
    if (!session?.accessToken) {
      return {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
          retryable: false,
        },
        success: false,
      };
    }

    // Validate files
    if (!files.length) {
      return {
        error: {
          code: "NO_FILES",
          message: "No files selected for upload",
          retryable: false,
        },
        success: false,
      };
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    return this.request("/resume/bulk-upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        // Don't set Content-Type for FormData
      },
      body: formData,
      timeout: 300000, // 5 minutes for bulk upload
      retry: { maxRetries: 1, retryDelay: 2000 },
    });
  }

  // Job Tracker Endpoints with enhanced error handling
  async getJobs(filters?: {
    status?: string;
    vendorName?: string;
    location?: string;
    appliedAfter?: string;
    appliedBefore?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  }): Promise<
    ApiResponse<{
      data: any[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>
  > {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.vendorName)
      queryParams.append("vendorName", filters.vendorName);
    if (filters?.location) queryParams.append("location", filters.location);
    if (filters?.appliedAfter)
      queryParams.append("appliedAfter", filters.appliedAfter);
    if (filters?.appliedBefore)
      queryParams.append("appliedBefore", filters.appliedBefore);
    if (filters?.page) queryParams.append("page", filters.page.toString());
    if (filters?.limit) queryParams.append("limit", filters.limit.toString());
    if (filters?.sortBy) queryParams.append("sortBy", filters.sortBy);
    if (filters?.sortOrder) queryParams.append("sortOrder", filters.sortOrder);

    const query = queryParams.toString();
    return this.request(`/job-tracker${query ? `?${query}` : ""}`, {
      retry: { maxRetries: 2 },
    });
  }

  async createJob(jobData: {
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
  }): Promise<ApiResponse<any>> {
    return this.request("/job-tracker", {
      method: "POST",
      body: JSON.stringify(jobData),
      retry: { maxRetries: 1 },
      skipErrorToast: true, // Let the mutation handle error display
    });
  }

  async getJob(jobId: string): Promise<ApiResponse<any>> {
    return this.request(`/job-tracker/${jobId}`, {
      retry: { maxRetries: 2 },
    });
  }

  async updateJob(
    jobId: string,
    updates: Partial<any>
  ): Promise<ApiResponse<any>> {
    return this.request(`/job-tracker/${jobId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
      retry: { maxRetries: 1 },
    });
  }

  async updateJobStatus(
    jobId: string,
    status: string
  ): Promise<ApiResponse<any>> {
    return this.request(`/job-tracker/${jobId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      retry: { maxRetries: 1 },
    });
  }

  async bulkUpdateJobStatus(
    jobIds: string[],
    status: string
  ): Promise<ApiResponse<any>> {
    return this.request("/job-tracker/bulk/status", {
      method: "PATCH",
      body: JSON.stringify({ jobIds, status }),
      retry: { maxRetries: 1 },
    });
  }

  async deleteJob(jobId: string): Promise<ApiResponse<any>> {
    return this.request(`/job-tracker/${jobId}`, {
      method: "DELETE",
      retry: { maxRetries: 1 },
    });
  }

  async getJobStats(): Promise<
    ApiResponse<{
      statusCounts: Record<string, number>;
      recentActivity: any[];
      upcomingFollowUps: any[];
      upcomingInterviews: any[];
    }>
  > {
    return this.request("/job-tracker/stats", {
      retry: { maxRetries: 2 },
    });
  }

  // JD Matching Endpoints
  async analyzeJobMatch(data: {
    resumeId: string;
    jobDescription: string;
    useSemanticMatching?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request("/jd-matching/analyze", {
      method: "POST",
      body: JSON.stringify(data),
      timeout: 60000, // 1 minute for AI analysis
      retry: { maxRetries: 1, retryDelay: 2000 },
    });
  }

  async getMatchingResults(matchingId: string): Promise<ApiResponse<any>> {
    return this.request(`/jd-matching/${matchingId}`, {
      retry: { maxRetries: 2 },
    });
  }

  // Resume Versions Endpoints
  async getResumeVersions(resumeId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/resume-versions/${resumeId}`, {
      retry: { maxRetries: 2 },
    });
  }

  async createResumeVersion(
    resumeId: string,
    changes: any
  ): Promise<ApiResponse<any>> {
    return this.request(`/resume-versions/${resumeId}`, {
      method: "POST",
      body: JSON.stringify(changes),
      retry: { maxRetries: 1 },
    });
  }

  async restoreResumeVersion(
    resumeId: string,
    versionId: string
  ): Promise<ApiResponse<any>> {
    return this.request(`/resume-versions/${resumeId}/restore/${versionId}`, {
      method: "POST",
      retry: { maxRetries: 1 },
    });
  }

  // Statistics and Analytics
  async getUserStats(): Promise<
    ApiResponse<{
      totalResumes: number;
      averageScore: number;
      totalJobs: number;
      interviewCalls: number;
      recentActivity: any[];
    }>
  > {
    return this.request("/analytics/user-stats", {
      retry: { maxRetries: 2 },
    });
  }

  // Health Check
  async healthCheck(): Promise<
    ApiResponse<{ status: string; timestamp: string }>
  > {
    return this.request("/health", {
      timeout: 5000,
      skipErrorToast: true,
      retry: { maxRetries: 1, retryDelay: 500 },
    });
  }
}

// Export enhanced singleton instance
export const apiClient = new EnhancedApiClient();
