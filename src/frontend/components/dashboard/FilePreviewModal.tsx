"use client";

import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatBytes } from "@/lib/utils";
import { Dialog, Transition } from "@headlessui/react";
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Fragment, useCallback, useEffect, useState } from "react";

interface FilePreviewModalProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
}

export function FilePreviewModal({
  file,
  isOpen,
  onClose,
}: FilePreviewModalProps) {
  const [fileContent, setFileContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [previewType, setPreviewType] = useState<
    "text" | "pdf" | "unsupported"
  >("text");

  const loadFileContent = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setFileContent("");

    try {
      const fileType = file.type.toLowerCase();

      if (fileType === "application/pdf") {
        setPreviewType("pdf");
        // For PDFs, we'll show a download option instead of content preview
        setFileContent("PDF files can be downloaded for viewing");
      } else if (fileType === "text/plain") {
        setPreviewType("text");
        const text = await file.text();
        setFileContent(text);
      } else if (
        fileType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileType === "application/msword"
      ) {
        setPreviewType("unsupported");
        setFileContent(
          "Word documents can be downloaded for viewing. Preview is not available for this file type."
        );
      } else {
        setPreviewType("text");
        // Try to read as text
        try {
          const text = await file.text();
          setFileContent(text);
        } catch {
          setPreviewType("unsupported");
          setFileContent("Preview is not available for this file type.");
        }
      }
    } catch (err) {
      setError(
        "Failed to load file content. Please try downloading the file instead."
      );
      console.error("File preview error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (isOpen && file) {
      loadFileContent();
    }
  }, [isOpen, file, loadFileContent]);

  const downloadFile = () => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileType = (type: string) => {
    switch (type.toLowerCase()) {
      case "application/pdf":
        return "PDF Document";
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return "Word Document (DOCX)";
      case "application/msword":
        return "Word Document (DOC)";
      case "text/plain":
        return "Text File";
      default:
        return "Document";
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium text-gray-900"
                      >
                        {file.name}
                      </Dialog.Title>
                      <p className="text-sm text-gray-500">
                        {formatFileType(file.type)} • {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadFile}
                      className="flex items-center"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner />
                      <span className="ml-2 text-gray-600">
                        Loading preview...
                      </span>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <div className="text-red-600 mb-2">⚠️ Preview Error</div>
                      <p className="text-gray-600">{error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadFile}
                        className="mt-4"
                      >
                        Download File Instead
                      </Button>
                    </div>
                  ) : previewType === "pdf" ? (
                    <div className="text-center py-12">
                      <div className="text-blue-600 text-4xl mb-4">📄</div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        PDF Preview
                      </h4>
                      <p className="text-gray-600 mb-4">
                        PDF files require external viewing. Click download to
                        open in your PDF viewer.
                      </p>
                      <Button
                        onClick={downloadFile}
                        className="inline-flex items-center"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  ) : previewType === "unsupported" ? (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-4xl mb-4">📄</div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Preview Not Available
                      </h4>
                      <p className="text-gray-600 mb-4">{fileContent}</p>
                      <Button
                        variant="outline"
                        onClick={downloadFile}
                        className="inline-flex items-center"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                        Download File
                      </Button>
                    </div>
                  ) : (
                    <div className="font-mono text-sm">
                      {fileContent.length > 0 ? (
                        <pre className="whitespace-pre-wrap break-words text-gray-800">
                          {fileContent}
                        </pre>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          File appears to be empty or cannot be displayed as
                          text.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-end space-x-3">
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  {previewType === "text" && fileContent.length > 0 && (
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(fileContent);
                        // Optional: show toast notification
                      }}
                      variant="secondary"
                    >
                      Copy Content
                    </Button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
