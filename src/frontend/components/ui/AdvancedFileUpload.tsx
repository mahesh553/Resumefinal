"use client";

import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import {
  FiCheck,
  FiDownload,
  FiEye,
  FiFile,
  FiFileMinus,
  FiFileText,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";

interface FileWithPreview extends File {
  id: string;
  preview?: string;
  progress?: number;
  status?: "uploading" | "success" | "error" | "processing";
  analysis?: {
    atsScore?: number;
    skillsFound?: number;
    improvements?: number;
  };
}

interface AdvancedFileUploadProps {
  onFilesUploaded?: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  showPreview?: boolean;
  allowMultiple?: boolean;
}

export function AdvancedFileUpload({
  onFilesUploaded,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = [".pdf", ".doc", ".docx", ".txt"],
  showPreview = true,
  allowMultiple = true,
}: AdvancedFileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Handle rejected files
      rejectedFiles.forEach((file) => {
        const { errors } = file;
        errors.forEach((error) => {
          if (error.code === "file-too-large") {
            toast.error(
              `File ${file.file.name} is too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB`
            );
          } else if (error.code === "file-invalid-type") {
            toast.error(
              `File ${file.file.name} is not supported. Accepted: ${acceptedTypes.join(", ")}`
            );
          } else {
            toast.error(`Error with file ${file.file.name}: ${error.message}`);
          }
        });
      });

      // Handle accepted files
      const newFiles: FileWithPreview[] = acceptedFiles.map((file) => ({
        ...file,
        id: Math.random().toString(36).substr(2, 9),
        preview:
          showPreview && file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        progress: 0,
        status: "uploading" as const,
      }));

      setFiles((prev) => {
        const combined = [...prev, ...newFiles];
        if (combined.length > maxFiles) {
          toast.error(`Maximum ${maxFiles} files allowed`);
          return prev;
        }
        return combined;
      });

      // Upload each file to the backend
      newFiles.forEach((file) => {
        uploadFile(file);
      });
    },
    [maxFiles, maxSize, acceptedTypes, showPreview]
  );

  const uploadFile = useCallback(
    async (file: FileWithPreview) => {
      setIsUploading(true);

      try {
        // Upload progress callback
        const onProgress = (progress: number) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === file.id ? { ...f, progress } : f))
          );
        };

        // Call the actual API
        const result = await apiClient.uploadResume(file, onProgress);

        if (result.error) {
          setFiles((prev) =>
            prev.map((f) => (f.id === file.id ? { ...f, status: "error" } : f))
          );
          toast.error(result.error);
          return;
        }

        // Update file status to processing
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "processing", progress: 100 } : f
          )
        );

        // Poll for analysis results
        const analysisId = result.data?.id;
        if (analysisId) {
          await pollForAnalysisResults(file.id, analysisId);
        } else {
          // Mark as success if no analysis ID (immediate response)
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, status: "success" } : f
            )
          );
          toast.success("Resume uploaded successfully!");
        }
      } catch (error) {
        console.error("Upload error:", error);
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, status: "error" } : f))
        );
        toast.error("Upload failed. Please try again.");
      } finally {
        setIsUploading(false);
      }

      if (onFilesUploaded) {
        onFilesUploaded(files);
      }
    },
    [files, onFilesUploaded]
  );

  const pollForAnalysisResults = async (fileId: string, analysisId: string) => {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    const poll = async () => {
      attempts++;

      try {
        const result = await apiClient.getAnalysis(analysisId);

        if (result.data && result.data.isProcessed) {
          // Analysis complete
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    status: "success",
                    analysis: {
                      atsScore: result.data.atsScore,
                      skillsFound:
                        result.data.parsedContent?.skills?.length || 0,
                      improvements: result.data.suggestions?.length || 0,
                    },
                  }
                : f
            )
          );
          toast.success("Resume analysis completed!");
          return;
        }

        if (attempts < maxAttempts) {
          // Continue polling
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          // Timeout
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, status: "error" } : f))
          );
          toast.error("Analysis timed out. Please check back later.");
        }
      } catch (error) {
        console.error("Polling error:", error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000);
        } else {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, status: "error" } : f))
          );
          toast.error("Failed to get analysis results.");
        }
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 2000);
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: acceptedTypes.reduce(
        (acc, type) => {
          acc[type] = [];
          return acc;
        },
        {} as Record<string, string[]>
      ),
      maxSize,
      multiple: allowMultiple,
      disabled: isUploading,
    });

  const dropzoneProps = getRootProps();

  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes("pdf")) return FiFileText;
    if (
      file.type.includes("word") ||
      file.name.endsWith(".docx") ||
      file.name.endsWith(".doc")
    )
      return FiFile;
    if (file.type.includes("text")) return FiFileMinus;
    return FiFile;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="w-full">
      {/* Upload Zone */}
      <div
        {...dropzoneProps}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-300 ease-in-out
          ${isDragActive && !isDragReject ? "border-primary-500 bg-primary-50" : ""}
          ${isDragReject ? "border-red-500 bg-red-50" : ""}
          ${!isDragActive ? "border-gray-300 hover:border-primary-400 hover:bg-gray-50" : ""}
          ${isUploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <input {...getInputProps()} ref={fileInputRef} />

          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: isDragActive ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mb-4"
          >
            <FiUploadCloud
              className={`mx-auto h-12 w-12 ${
                isDragActive ? "text-primary-500" : "text-gray-400"
              }`}
            />
          </motion.div>

          <div className="space-y-2">
            {isDragActive ? (
              <p className="text-lg font-medium text-primary-600">
                {isDragReject
                  ? "File type not supported"
                  : "Drop files here..."}
              </p>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-700">
                  Drag & drop your resume here
                </p>
                <p className="text-sm text-gray-500">
                  or{" "}
                  <button
                    type="button"
                    className="text-primary-600 hover:text-primary-500 font-medium"
                  >
                    browse files
                  </button>
                </p>
              </>
            )}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>Supports: {acceptedTypes.join(", ")}</p>
            <p>Max file size: {Math.round(maxSize / 1024 / 1024)}MB</p>
            <p>Max files: {maxFiles}</p>
          </div>
        </motion.div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 space-y-3"
          >
            <h3 className="text-lg font-medium text-gray-900">
              Uploaded Files ({files.length})
            </h3>

            {files.map((file) => {
              const IconComponent = getFileIcon(file);

              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="glass-effect rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <IconComponent className="h-8 w-8 text-primary-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.size)}
                        </p>

                        {/* Progress Bar */}
                        {file.status === "uploading" && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Uploading...</span>
                              <span>{file.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <motion.div
                                className="bg-primary-600 h-1.5 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${file.progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Processing Status */}
                        {file.status === "processing" && (
                          <div className="mt-2 flex items-center text-xs text-blue-600">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2" />
                            Processing...
                          </div>
                        )}

                        {/* Analysis Results */}
                        {file.status === "success" && file.analysis && (
                          <div className="mt-2 flex space-x-4 text-xs">
                            <span className="text-green-600">
                              ATS Score: {file.analysis.atsScore}%
                            </span>
                            <span className="text-blue-600">
                              Skills: {file.analysis.skillsFound}
                            </span>
                            <span className="text-orange-600">
                              Improvements: {file.analysis.improvements}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center space-x-2">
                      {file.status === "success" && (
                        <>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center justify-center w-6 h-6 bg-green-100 rounded-full"
                          >
                            <FiCheck className="w-4 h-4 text-green-600" />
                          </motion.div>

                          <Button variant="ghost" size="sm">
                            <FiEye className="w-4 h-4" />
                          </Button>

                          <Button variant="ghost" size="sm">
                            <FiDownload className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {file.status === "error" && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center justify-center w-6 h-6 bg-red-100 rounded-full"
                        >
                          <FiX className="w-4 h-4 text-red-600" />
                        </motion.div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Actions */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 flex justify-between"
        >
          <Button
            variant="secondary"
            onClick={() => setFiles([])}
            disabled={isUploading}
          >
            Clear All
          </Button>

          <Button
            disabled={files.some((f) => f.status !== "success") || isUploading}
            className="ml-auto"
          >
            Analyze Resumes (
            {files.filter((f) => f.status === "success").length})
          </Button>
        </motion.div>
      )}
    </div>
  );
}
