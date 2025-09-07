"use client";

import { ApiError, ApiResponse } from "@/lib/api";
import { useErrorReporting } from "@/lib/errorReporting";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

// Upload attempt information
interface UploadAttempt {
  id: string;
  timestamp: Date;
  error?: ApiError;
  progress?: number;
  status: "pending" | "uploading" | "success" | "failed" | "cancelled";
}

// File upload state
interface FileUploadState {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  status:
    | "pending"
    | "uploading"
    | "success"
    | "failed"
    | "cancelled"
    | "paused";
  progress: number;
  error?: ApiError;
  attempts: UploadAttempt[];
  result?: any;
  retryCount: number;
  maxRetries: number;
  pauseResumeSupported: boolean;
  chunks?: Blob[];
  currentChunk?: number;
}

// Upload recovery options
interface RecoveryOptions {
  enableAutoRetry: boolean;
  maxAutoRetries: number;
  retryDelay: number;
  enableChunkedUpload: boolean;
  chunkSize: number; // bytes
  enablePauseResume: boolean;
  enableOfflineQueue: boolean;
  compressionEnabled: boolean;
  compressionQuality: number;
}

// Upload queue manager
class UploadQueueManager {
  private queue: FileUploadState[] = [];
  private activeUploads = new Map<string, AbortController>();
  private options: RecoveryOptions;
  private onStateChange?: (queue: FileUploadState[]) => void;

  constructor(options: RecoveryOptions) {
    this.options = options;
  }

  setStateChangeCallback(callback: (queue: FileUploadState[]) => void) {
    this.onStateChange = callback;
  }

  private notifyStateChange() {
    this.onStateChange?.(this.queue);
  }

  addFile(file: File): string {
    const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const uploadState: FileUploadState = {
      file,
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "pending",
      progress: 0,
      attempts: [],
      retryCount: 0,
      maxRetries: this.options.maxAutoRetries,
      pauseResumeSupported: this.options.enablePauseResume,
      chunks: this.options.enableChunkedUpload
        ? this.createChunks(file)
        : undefined,
      currentChunk: 0,
    };

    this.queue.push(uploadState);
    this.notifyStateChange();
    return id;
  }

  private createChunks(file: File): Blob[] {
    const chunks: Blob[] = [];
    const chunkSize = this.options.chunkSize;

    for (let start = 0; start < file.size; start += chunkSize) {
      const end = Math.min(start + chunkSize, file.size);
      chunks.push(file.slice(start, end));
    }

    return chunks;
  }

  async uploadFile(
    id: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const uploadState = this.queue.find((item) => item.id === id);
    if (!uploadState) return;

    uploadState.status = "uploading";
    this.notifyStateChange();

    const controller = new AbortController();
    this.activeUploads.set(id, controller);

    try {
      let result: ApiResponse<any>;

      if (this.options.enableChunkedUpload && uploadState.chunks) {
        result = await this.uploadChunked(
          uploadState,
          onProgress,
          controller.signal
        );
      } else {
        result = await this.uploadDirect(
          uploadState,
          onProgress,
          controller.signal
        );
      }

      if (result.success) {
        uploadState.status = "success";
        uploadState.result = result.data;
        uploadState.progress = 100;
      } else {
        throw result.error;
      }
    } catch (error) {
      await this.handleUploadError(id, error as ApiError);
    } finally {
      this.activeUploads.delete(id);
      this.notifyStateChange();
    }
  }

  private async uploadDirect(
    uploadState: FileUploadState,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<ApiResponse<any>> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      if (signal) {
        signal.addEventListener("abort", () => xhr.abort());
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          uploadState.progress = progress;
          onProgress?.(progress);
          this.notifyStateChange();
        }
      };

      xhr.onload = () => {
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
            } as ApiError,
            success: false,
          });
        }
      };

      xhr.onerror = () => {
        resolve({
          error: {
            code: "UPLOAD_NETWORK_ERROR",
            message: "Upload failed - network error",
            retryable: true,
          } as ApiError,
          success: false,
        });
      };

      xhr.onabort = () => {
        resolve({
          error: {
            code: "UPLOAD_CANCELLED",
            message: "Upload was cancelled",
            retryable: false,
          } as ApiError,
          success: false,
        });
      };

      const formData = new FormData();
      formData.append("file", uploadState.file);

      xhr.open("POST", "/api/resume/upload");
      xhr.send(formData);
    });
  }

  private async uploadChunked(
    uploadState: FileUploadState,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<ApiResponse<any>> {
    if (!uploadState.chunks) {
      throw new Error("Chunks not available for chunked upload");
    }

    const totalChunks = uploadState.chunks.length;
    let uploadedChunks = uploadState.currentChunk || 0;

    // Resume from where we left off
    for (let i = uploadedChunks; i < totalChunks; i++) {
      if (signal?.aborted) {
        throw new Error("Upload cancelled");
      }

      const chunk = uploadState.chunks[i];
      const isLastChunk = i === totalChunks - 1;

      try {
        await this.uploadChunk(uploadState, chunk, i, totalChunks, isLastChunk);
        uploadedChunks = i + 1;
        uploadState.currentChunk = uploadedChunks;

        const progress = (uploadedChunks / totalChunks) * 100;
        uploadState.progress = progress;
        onProgress?.(progress);
        this.notifyStateChange();
      } catch (error) {
        // Save progress for resume
        uploadState.currentChunk = i;
        throw error;
      }
    }

    // Finalize upload
    return this.finalizeChunkedUpload(uploadState);
  }

  private async uploadChunk(
    uploadState: FileUploadState,
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number,
    isLastChunk: boolean
  ): Promise<void> {
    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("chunkIndex", chunkIndex.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("fileName", uploadState.name);
    formData.append("fileId", uploadState.id);

    const response = await fetch("/api/resume/upload-chunk", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Chunk ${chunkIndex} upload failed`);
    }
  }

  private async finalizeChunkedUpload(
    uploadState: FileUploadState
  ): Promise<ApiResponse<any>> {
    const response = await fetch("/api/resume/finalize-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileId: uploadState.id,
        fileName: uploadState.name,
        totalSize: uploadState.size,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { data, success: true };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: {
          code: "FINALIZE_FAILED",
          message: errorData.error || "Failed to finalize upload",
          retryable: true,
        } as ApiError,
        success: false,
      };
    }
  }

  private async handleUploadError(id: string, error: ApiError): Promise<void> {
    const uploadState = this.queue.find((item) => item.id === id);
    if (!uploadState) return;

    uploadState.error = error;
    uploadState.retryCount++;

    const attempt: UploadAttempt = {
      id: `attempt_${Date.now()}`,
      timestamp: new Date(),
      error,
      status: "failed",
    };
    uploadState.attempts.push(attempt);

    // Auto-retry logic
    if (
      this.options.enableAutoRetry &&
      uploadState.retryCount < uploadState.maxRetries &&
      error.retryable
    ) {
      uploadState.status = "pending";

      // Exponential backoff
      const delay =
        this.options.retryDelay * Math.pow(2, uploadState.retryCount - 1);

      setTimeout(() => {
        this.uploadFile(id);
      }, delay);
    } else {
      uploadState.status = "failed";
    }

    this.notifyStateChange();
  }

  pauseUpload(id: string): void {
    const controller = this.activeUploads.get(id);
    if (controller) {
      controller.abort();
    }

    const uploadState = this.queue.find((item) => item.id === id);
    if (uploadState) {
      uploadState.status = "paused";
      this.notifyStateChange();
    }
  }

  resumeUpload(id: string): void {
    const uploadState = this.queue.find((item) => item.id === id);
    if (uploadState && uploadState.status === "paused") {
      this.uploadFile(id);
    }
  }

  retryUpload(id: string): void {
    const uploadState = this.queue.find((item) => item.id === id);
    if (uploadState) {
      uploadState.status = "pending";
      uploadState.error = undefined;
      uploadState.progress = 0;
      // Reset chunk progress but keep chunks
      if (uploadState.chunks) {
        uploadState.currentChunk = 0;
      }
      this.uploadFile(id);
    }
  }

  cancelUpload(id: string): void {
    const controller = this.activeUploads.get(id);
    if (controller) {
      controller.abort();
    }

    const uploadState = this.queue.find((item) => item.id === id);
    if (uploadState) {
      uploadState.status = "cancelled";
      this.notifyStateChange();
    }
  }

  removeUpload(id: string): void {
    this.cancelUpload(id);
    this.queue = this.queue.filter((item) => item.id !== id);
    this.notifyStateChange();
  }

  getQueue(): FileUploadState[] {
    return this.queue;
  }

  getUpload(id: string): FileUploadState | undefined {
    return this.queue.find((item) => item.id === id);
  }
}

// Upload recovery hook
export function useUploadRecovery(options: Partial<RecoveryOptions> = {}) {
  const { reportError } = useErrorReporting();
  const [queue, setQueue] = useState<FileUploadState[]>([]);

  const defaultOptions: RecoveryOptions = {
    enableAutoRetry: true,
    maxAutoRetries: 3,
    retryDelay: 1000,
    enableChunkedUpload: true,
    chunkSize: 1024 * 1024, // 1MB chunks
    enablePauseResume: true,
    enableOfflineQueue: true,
    compressionEnabled: false,
    compressionQuality: 0.8,
    ...options,
  };

  const managerRef = useRef<UploadQueueManager>(
    new UploadQueueManager(defaultOptions)
  );

  useEffect(() => {
    const manager = managerRef.current;
    manager.setStateChangeCallback(setQueue);

    return () => {
      manager.setStateChangeCallback(() => {});
    };
  }, []);

  const addFile = useCallback(
    (file: File): string => {
      try {
        const id = managerRef.current.addFile(file);
        managerRef.current.uploadFile(id);
        return id;
      } catch (error) {
        reportError(error as Error, {
          metadata: { component: "upload_recovery", action: "add_file" },
        });
        throw error;
      }
    },
    [reportError]
  );

  const addFiles = useCallback(
    (files: File[]): string[] => {
      return files.map((file) => addFile(file));
    },
    [addFile]
  );

  const retryUpload = useCallback((id: string) => {
    managerRef.current.retryUpload(id);
  }, []);

  const pauseUpload = useCallback((id: string) => {
    managerRef.current.pauseUpload(id);
  }, []);

  const resumeUpload = useCallback((id: string) => {
    managerRef.current.resumeUpload(id);
  }, []);

  const cancelUpload = useCallback((id: string) => {
    managerRef.current.cancelUpload(id);
  }, []);

  const removeUpload = useCallback((id: string) => {
    managerRef.current.removeUpload(id);
  }, []);

  const clearCompleted = useCallback(() => {
    const completed = queue.filter(
      (item) => item.status === "success" || item.status === "cancelled"
    );
    completed.forEach((item) => removeUpload(item.id));
  }, [queue, removeUpload]);

  const retryAll = useCallback(() => {
    const failed = queue.filter((item) => item.status === "failed");
    failed.forEach((item) => retryUpload(item.id));
  }, [queue, retryUpload]);

  return {
    queue,
    addFile,
    addFiles,
    retryUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    removeUpload,
    clearCompleted,
    retryAll,
    options: defaultOptions,
  };
}

// Upload recovery UI component
interface UploadRecoveryUIProps {
  uploads: FileUploadState[];
  onRetry: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onRetryAll: () => void;
  onClearCompleted: () => void;
  className?: string;
}

export function UploadRecoveryUI({
  uploads,
  onRetry,
  onPause,
  onResume,
  onCancel,
  onRemove,
  onRetryAll,
  onClearCompleted,
  className = "",
}: UploadRecoveryUIProps) {
  const failedUploads = uploads.filter((upload) => upload.status === "failed");
  const completedUploads = uploads.filter(
    (upload) => upload.status === "success" || upload.status === "cancelled"
  );

  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Bulk actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          Upload Queue ({uploads.length})
        </h3>
        <div className="flex gap-2">
          {failedUploads.length > 0 && (
            <button
              onClick={onRetryAll}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry All Failed
            </button>
          )}
          {completedUploads.length > 0 && (
            <button
              onClick={onClearCompleted}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Clear Completed
            </button>
          )}
        </div>
      </div>

      {/* Upload items */}
      <div className="space-y-2">
        <AnimatePresence>
          {uploads.map((upload) => (
            <UploadItem
              key={upload.id}
              upload={upload}
              onRetry={() => onRetry(upload.id)}
              onPause={() => onPause(upload.id)}
              onResume={() => onResume(upload.id)}
              onCancel={() => onCancel(upload.id)}
              onRemove={() => onRemove(upload.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Individual upload item component
interface UploadItemProps {
  upload: FileUploadState;
  onRetry: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRemove: () => void;
}

function UploadItem({
  upload,
  onRetry,
  onPause,
  onResume,
  onCancel,
  onRemove,
}: UploadItemProps) {
  const getStatusColor = () => {
    switch (upload.status) {
      case "success":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      case "uploading":
        return "text-blue-600";
      case "paused":
        return "text-yellow-600";
      case "cancelled":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = () => {
    switch (upload.status) {
      case "success":
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case "failed":
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case "uploading":
        return <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
    >
      {getStatusIcon()}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 truncate">
            {upload.name}
          </p>
          <span className={`text-xs font-medium ${getStatusColor()}`}>
            {upload.status.toUpperCase()}
          </span>
        </div>

        <div className="mt-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatFileSize(upload.size)}</span>
            <span>{upload.progress.toFixed(1)}%</span>
          </div>
          <div className="mt-1 bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                upload.status === "success"
                  ? "bg-green-500"
                  : upload.status === "failed"
                    ? "bg-red-500"
                    : upload.status === "uploading"
                      ? "bg-blue-500"
                      : "bg-gray-400"
              }`}
              style={{ width: `${upload.progress}%` }}
            />
          </div>
        </div>

        {upload.error && (
          <p className="mt-1 text-xs text-red-600">{upload.error.message}</p>
        )}

        {upload.retryCount > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Retry attempt {upload.retryCount}/{upload.maxRetries}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {upload.status === "failed" && (
          <button
            onClick={onRetry}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Retry upload"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        )}

        {upload.status === "uploading" && upload.pauseResumeSupported && (
          <button
            onClick={onPause}
            className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
            title="Pause upload"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}

        {upload.status === "paused" && (
          <button
            onClick={onResume}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Resume upload"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        )}

        {upload.status === "uploading" && (
          <button
            onClick={onCancel}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="Cancel upload"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onRemove}
          className="p-1 text-gray-600 hover:bg-gray-50 rounded"
          title="Remove from queue"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// Utility function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Export types
export type { FileUploadState, RecoveryOptions, UploadAttempt };
