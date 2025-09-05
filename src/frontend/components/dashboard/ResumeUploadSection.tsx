'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { formatBytes } from '@/lib/utils';
import type { UploadProgress } from '@/types';

export function ResumeUploadSection() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploadProgress(prev => [...prev, ...newUploads]);
    handleUpload(newUploads);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  const handleUpload = async (uploads: UploadProgress[]) => {
    setIsUploading(true);

    for (const upload of uploads) {
      try {
        // Update status to uploading
        setUploadProgress(prev =>
          prev.map(item =>
            item.file === upload.file
              ? { ...item, status: 'uploading' }
              : item
          )
        );

        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setUploadProgress(prev =>
            prev.map(item =>
              item.file === upload.file
                ? { ...item, progress }
                : item
            )
          );
        }

        // Update to processing
        setUploadProgress(prev =>
          prev.map(item =>
            item.file === upload.file
              ? { ...item, status: 'processing', progress: 100 }
              : item
          )
        );

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Complete
        setUploadProgress(prev =>
          prev.map(item =>
            item.file === upload.file
              ? { ...item, status: 'completed' }
              : item
          )
        );
      } catch (error) {
        setUploadProgress(prev =>
          prev.map(item =>
            item.file === upload.file
              ? { ...item, status: 'error', error: 'Upload failed' }
              : item
          )
        );
      }
    }

    setIsUploading(false);
  };

  const removeUpload = (fileToRemove: File) => {
    setUploadProgress(prev => prev.filter(item => item.file !== fileToRemove));
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-success-600" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-error-600" />;
      default:
        return <DocumentTextIcon className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusText = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="card">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-semibold text-gray-900 mb-2">
          Upload Your Resume
        </h2>
        <p className="text-gray-600">
          Upload your resume in PDF, DOCX, DOC, or TXT format for AI-powered analysis and optimization.
        </p>
      </div>

      {/* Dropzone */}
      <motion.div
        {...(getRootProps() as any)}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
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
              {isDragActive ? 'Drop files here' : 'Drag & drop your resume'}
            </p>
            <p className="text-gray-500 mt-1">
              or{' '}
              <span className="text-primary-600 font-medium">browse files</span>
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

      {/* Upload Progress */}
      <AnimatePresence>
        {uploadProgress.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 space-y-4"
          >
            <h3 className="text-lg font-medium text-gray-900">Upload Progress</h3>
            
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
                          {formatBytes(upload.file.size)} • {getStatusText(upload.status)}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUpload(upload.file)}
                      className="text-gray-400 hover:text-error-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Progress Bar */}
                  {upload.status === 'uploading' || upload.status === 'processing' ? (
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
                    <p className="text-sm text-error-600 mt-2">{upload.error}</p>
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
          onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
          disabled={isUploading}
        >
          <DocumentTextIcon className="w-4 h-4 mr-2" />
          Browse Files
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setUploadProgress([])}
          disabled={isUploading || uploadProgress.length === 0}
        >
          Clear All
        </Button>
      </div>
    </div>
  );
}