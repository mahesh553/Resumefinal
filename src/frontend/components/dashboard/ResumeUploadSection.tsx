"use client";

import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import type { UploadProgress } from "@/types";
import {
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { FilePreviewModal } from "./FilePreviewModal";

export function ResumeUploadSection() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((file) => {
        // Additional validation
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 10MB.`);
          return false;
        }

        // Check for duplicate files
        const isDuplicate = uploadProgress.some(
          (upload) =>
            upload.file.name === file.name && upload.file.size === file.size
        );

        if (isDuplicate) {
          toast.error(`${file.name} is already in the upload queue.`);
          return false;
        }

        return true;
      });

      if (validFiles.length === 0) return;

      const newUploads = validFiles.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      }));

      setUploadProgress((prev) => [...prev, ...newUploads]);
      handleUpload(newUploads);
    },
    [uploadProgress]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  const dropzoneProps = getRootProps();

  const handleUpload = async (uploads: UploadProgress[]) => {
    setIsUploading(true);

    for (const upload of uploads) {
      try {
        // Update status to uploading
        setUploadProgress((prev) =>
          prev.map((item) =>
            item.file === upload.file ? { ...item, status: "uploading" } : item
          )
        );

        // Use real API upload with progress tracking
        const result = await apiClient.uploadResume(upload.file, (progress) => {
          setUploadProgress((prev) =>
            prev.map((item) =>
              item.file === upload.file ? { ...item, progress } : item
            )
          );
        });

        if (result.error) {
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : result.error.message
          );
        }

        // Update to processing
        setUploadProgress((prev) =>
          prev.map((item) =>
            item.file === upload.file
              ? { ...item, status: "processing", progress: 100 }
              : item
          )
        );

        // Show success message
        toast.success(`${upload.file.name} uploaded successfully!`);

        // Complete
        setUploadProgress((prev) =>
          prev.map((item) =>
            item.file === upload.file
              ? {
                  ...item,
                  status: "completed",
                  resumeId: result.data?.id,
                }
              : item
          )
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        toast.error(`Failed to upload ${upload.file.name}: ${errorMessage}`);

        setUploadProgress((prev) =>
          prev.map((item) =>
            item.file === upload.file
              ? { ...item, status: "error", error: errorMessage }
              : item
          )
        );
      }
    }

    setIsUploading(false);
  };

  const removeUpload = (fileToRemove: File) => {
    setUploadProgress((prev) =>
      prev.filter((item) => item.file !== fileToRemove)
    );
  };

  const bulkUploadFiles = async () => {
    if (uploadQueue.length === 0) {
      toast.error("No files in queue to upload.");
      return;
    }

    try {
      setIsUploading(true);
      const result = await apiClient.bulkUploadResumes(uploadQueue);

      if (result.error) {
        toast.error(`Bulk upload failed: ${result.error}`);
        return;
      }

      toast.success(
        `Bulk upload started! Processing ${result.data?.totalFiles} files.`
      );
      setUploadQueue([]);

      // Add files to progress tracking
      const newUploads = uploadQueue.map((file) => ({
        file,
        progress: 0,
        status: "processing" as const,
      }));

      setUploadProgress((prev) => [...prev, ...newUploads]);
    } catch (error) {
      toast.error("Bulk upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const _addToQueue = (files: File[]) => {
    setUploadQueue((prev) => {
      const newFiles = files.filter(
        (file) =>
          !prev.some(
            (queueFile) =>
              queueFile.name === file.name && queueFile.size === file.size
          )
      );
      return [...prev, ...newFiles];
    });
  };

  const removeFromQueue = (fileToRemove: File) => {
    setUploadQueue((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handlePreviewFile = (file: File) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
  };

  const retryUpload = async (fileToRetry: File) => {
    const uploadToRetry = uploadProgress.find(
      (item) => item.file === fileToRetry
    );
    if (uploadToRetry) {
      // Reset the upload status
      setUploadProgress((prev) =>
        prev.map((item) =>
          item.file === fileToRetry
            ? { ...item, status: "pending", progress: 0, error: undefined }
            : item
        )
      );

      // Retry the upload
      await handleUpload([uploadToRetry]);
    }
  };

  const getStatusIcon = (status: UploadProgress["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="w-5 h-5 text-success-600" />;
      case "error":
        return <ExclamationTriangleIcon className="w-5 h-5 text-error-600" />;
      default:
        return <DocumentTextIcon className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusText = (status: UploadProgress["status"]) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "uploading":
        return "Uploading...";
      case "processing":
        return "Processing...";
      case "completed":
        return "Completed";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="card">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-semibold text-gray-900 mb-2">
          Upload Your Resume
        </h2>
        <p className="text-gray-600">
          Upload your resume in PDF, DOCX, DOC, or TXT format for AI-powered
          analysis and optimization.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...dropzoneProps}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-primary-400 bg-primary-50"
            : "border-gray-300 hover:border-primary-400 hover:bg-gray-50"
        }`}
      >
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <input {...getInputProps()} />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <CloudArrowUpIcon className="w-8 h-8 text-white" />
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900">
                {isDragActive ? "Drop files here" : "Drag & drop your resume"}
              </p>
              <p className="text-gray-500 mt-1">
                or{" "}
                <span className="text-primary-600 font-medium">
                  browse files
                </span>
              </p>
            </div>

            <div className="text-sm text-gray-400">
              Supports PDF, DOCX, DOC, TXT • Max 10MB per file
            </div>
          </motion.div>

          {/* Animated Background */}
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary-500/5 rounded-2xl border-2 border-primary-400"
            />
          )}
        </motion.div>
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Upload Queue ({uploadQueue.length} files)
            </h3>
            <Button onClick={bulkUploadFiles} disabled={isUploading} size="sm">
              Upload All
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {uploadQueue.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
              >
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFromQueue(file)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Upload Progress */}
      <AnimatePresence>
        {uploadProgress.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 space-y-4"
          >
            <h3 className="text-lg font-medium text-gray-900">
              Upload Progress
            </h3>

            <div className="space-y-3">
              {uploadProgress.map((upload) => (
                <motion.div
                  key={upload.file.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-gray-50 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(upload.status)}
                      <div>
                        <p className="font-medium text-gray-900">
                          {upload.file.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatBytes(upload.file.size)} •{" "}
                          {getStatusText(upload.status)}
                          {upload.status === "completed" && upload.resumeId && (
                            <span className="ml-2 text-green-600">
                              ✓ Ready for analysis
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(upload.status === "completed" ||
                        upload.status === "error") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewFile(upload.file)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      )}
                      {upload.status === "error" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryUpload(upload.file)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUpload(upload.file)}
                        className="text-gray-400 hover:text-error-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {upload.status === "uploading" ||
                  upload.status === "processing" ? (
                    <div className="progress-bar">
                      <motion.div
                        className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${upload.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  ) : null}

                  {upload.error && (
                    <p className="text-sm text-error-600 mt-2">
                      {upload.error}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() =>
            (
              document.querySelector('input[type="file"]') as HTMLInputElement
            )?.click()
          }
          disabled={isUploading}
        >
          <DocumentTextIcon className="w-4 h-4 mr-2" />
          Browse Files
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            setUploadProgress([]);
            setUploadQueue([]);
          }}
          disabled={
            isUploading ||
            (uploadProgress.length === 0 && uploadQueue.length === 0)
          }
        >
          Clear All
        </Button>

        {uploadProgress.filter((item) => item.status === "completed").length >
          0 && (
          <Button
            variant="outline"
            onClick={() => {
              const completedUploads = uploadProgress.filter(
                (item) => item.status === "completed"
              );
              toast.success(
                `${completedUploads.length} resumes ready for analysis!`
              );
            }}
          >
            View Results (
            {
              uploadProgress.filter((item) => item.status === "completed")
                .length
            }
            )
          </Button>
        )}

        {uploadProgress.filter((item) => item.status === "error").length >
          0 && (
          <Button
            variant="outline"
            onClick={async () => {
              const failedUploads = uploadProgress.filter(
                (item) => item.status === "error"
              );
              for (const upload of failedUploads) {
                await retryUpload(upload.file);
              }
            }}
            disabled={isUploading}
          >
            Retry Failed (
            {uploadProgress.filter((item) => item.status === "error").length})
          </Button>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          isOpen={isPreviewOpen}
          onClose={closePreview}
        />
      )}
    </div>
  );
}
