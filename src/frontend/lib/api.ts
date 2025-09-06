import { getSession } from "next-auth/react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

interface UploadProgressCallback {
  (progress: number): void;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await getSession();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();

      const config: RequestInit = {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      };

      const response = await fetch(`${this.baseURL}${endpoint}`, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        return {
          error: errorData.error || errorData.message || "Request failed",
        };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error("API request failed:", error);
      return { error: "Network error or server unavailable" };
    }
  }

  // Resume Analysis Endpoints
  async uploadResume(
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<ApiResponse<{ id: string; status: string; message: string }>> {
    try {
      const session = await getSession();
      if (!session?.accessToken) {
        return { error: "Authentication required" };
      }

      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      return new Promise((resolve) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 201) {
            const data = JSON.parse(xhr.responseText);
            resolve({ data });
          } else {
            const errorData = JSON.parse(xhr.responseText || "{}");
            resolve({ error: errorData.error || "Upload failed" });
          }
        };

        xhr.onerror = () => {
          resolve({ error: "Upload failed - network error" });
        };

        xhr.open("POST", `${this.baseURL}/resume/upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${session.accessToken}`);
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Upload error:", error);
      return { error: "Upload failed" };
    }
  }

  async getAnalysis(analysisId: string): Promise<ApiResponse<any>> {
    return this.request(`/resume/analysis/${analysisId}`);
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
    return this.request(`/resume/list?page=${page}&limit=${limit}`);
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
      return { error: "Authentication required" };
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
    });
  }

  // Job Tracker Endpoints
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
    return this.request(`/job-tracker${query ? `?${query}` : ""}`);
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
    });
  }

  async getJob(jobId: string): Promise<ApiResponse<any>> {
    return this.request(`/job-tracker/${jobId}`);
  }

  async updateJob(
    jobId: string,
    updates: Partial<any>
  ): Promise<ApiResponse<any>> {
    return this.request(`/job-tracker/${jobId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  async updateJobStatus(
    jobId: string,
    status: string
  ): Promise<ApiResponse<any>> {
    return this.request(`/job-tracker/${jobId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async bulkUpdateJobStatus(
    jobIds: string[],
    status: string
  ): Promise<ApiResponse<any>> {
    return this.request("/job-tracker/bulk/status", {
      method: "PATCH",
      body: JSON.stringify({ jobIds, status }),
    });
  }

  async deleteJob(jobId: string): Promise<ApiResponse<any>> {
    return this.request(`/job-tracker/${jobId}`, {
      method: "DELETE",
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
    return this.request("/job-tracker/stats");
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
    });
  }

  async getMatchingResults(matchingId: string): Promise<ApiResponse<any>> {
    return this.request(`/jd-matching/${matchingId}`);
  }

  // Resume Versions Endpoints
  async getResumeVersions(resumeId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/resume-versions/${resumeId}`);
  }

  async createResumeVersion(
    resumeId: string,
    changes: any
  ): Promise<ApiResponse<any>> {
    return this.request(`/resume-versions/${resumeId}`, {
      method: "POST",
      body: JSON.stringify(changes),
    });
  }

  async restoreResumeVersion(
    resumeId: string,
    versionId: string
  ): Promise<ApiResponse<any>> {
    return this.request(`/resume-versions/${resumeId}/restore/${versionId}`, {
      method: "POST",
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
    return this.request("/analytics/user-stats");
  }

  // Health Check
  async healthCheck(): Promise<
    ApiResponse<{ status: string; timestamp: string }>
  > {
    return this.request("/health");
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types for use in components
export type { ApiResponse, UploadProgressCallback };
