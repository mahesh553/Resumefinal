"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "@/components/ui/Toast";
import { useErrorReporting } from "@/lib/errorReporting";
import {
  ArrowDownTrayIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  EyeIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "users" | "analytics" | "system" | "custom";
  estimatedTime: string;
  fields: ReportField[];
}

interface ReportField {
  id: string;
  name: string;
  type: "string" | "number" | "date" | "boolean";
  required: boolean;
  description?: string;
}

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  createdAt: Date;
  createdBy: string;
  status: "generating" | "completed" | "failed";
  fileSize?: number;
  downloadUrl?: string;
  parameters: Record<string, any>;
}

interface ReportParameters {
  dateRange: {
    start: string;
    end: string;
  };
  format: "csv" | "xlsx" | "pdf";
  includeInactive: boolean;
  groupBy?: string;
  filters: Record<string, any>;
}

const reportTypes: ReportType[] = [
  {
    id: "user_analytics",
    name: "User Analytics Report",
    description: "Comprehensive user activity and engagement metrics",
    icon: UsersIcon,
    category: "users",
    estimatedTime: "2-3 minutes",
    fields: [
      {
        id: "includeRegistrations",
        name: "Include Registrations",
        type: "boolean",
        required: false,
      },
      {
        id: "includeLogins",
        name: "Include Login Data",
        type: "boolean",
        required: false,
      },
    ],
  },
  {
    id: "resume_statistics",
    name: "Resume Statistics",
    description: "Resume creation, updates, and download statistics",
    icon: DocumentTextIcon,
    category: "analytics",
    estimatedTime: "1-2 minutes",
    fields: [
      {
        id: "includeTemplates",
        name: "Include Template Usage",
        type: "boolean",
        required: false,
      },
    ],
  },
  {
    id: "application_tracking",
    name: "Application Tracking Report",
    description: "Job application submissions and status tracking",
    icon: BriefcaseIcon,
    category: "analytics",
    estimatedTime: "2-4 minutes",
    fields: [
      {
        id: "includeStatusHistory",
        name: "Include Status History",
        type: "boolean",
        required: false,
      },
    ],
  },
  {
    id: "system_performance",
    name: "System Performance Report",
    description: "Server performance, response times, and error rates",
    icon: ChartBarIcon,
    category: "system",
    estimatedTime: "3-5 minutes",
    fields: [
      {
        id: "includeErrorLogs",
        name: "Include Error Logs",
        type: "boolean",
        required: false,
      },
    ],
  },
];

export function AdminReports() {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [parameters, setParameters] = useState<ReportParameters>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
    format: "csv",
    includeInactive: false,
    filters: {},
  });
  const { reportError } = useErrorReporting();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/reports");
      if (!response.ok) throw new Error("Failed to fetch reports");
      const data = await response.json();
      setReports(data);
    } catch (error) {
      reportError(error as Error, {
        metadata: { component: "AdminReports", action: "fetchReports" },
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportType: ReportType) => {
    try {
      setGenerating(reportType.id);

      const payload = {
        type: reportType.id,
        parameters: {
          ...parameters,
          ...reportType.fields.reduce(
            (acc, field) => {
              acc[field.id] = parameters.filters[field.id] || false;
              return acc;
            },
            {} as Record<string, any>
          ),
        },
      };

      const response = await fetch("/api/admin/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to generate report");

      const result = await response.json();
      toast.success("Report generation started");

      // Refresh reports list
      setTimeout(fetchReports, 2000);
    } catch (error) {
      reportError(error as Error, {
        metadata: { component: "AdminReports", action: "generateReport" },
      });
      toast.error("Failed to generate report");
    } finally {
      setGenerating(null);
    }
  };

  const downloadReport = async (report: GeneratedReport) => {
    try {
      if (!report.downloadUrl) return;

      const response = await fetch(report.downloadUrl);
      if (!response.ok) throw new Error("Failed to download report");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.name}_${new Date(report.createdAt).toISOString().split("T")[0]}.${parameters.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Report downloaded successfully");
    } catch (error) {
      reportError(error as Error, {
        metadata: { component: "AdminReports", action: "downloadReport" },
      });
      toast.error("Failed to download report");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">
            Generate and download system reports
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Generation */}
        <Card className="lg:col-span-1">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Generate New Report
            </h3>

            {/* Report Parameters */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={parameters.dateRange.start}
                    onChange={(e) =>
                      setParameters({
                        ...parameters,
                        dateRange: {
                          ...parameters.dateRange,
                          start: e.target.value,
                        },
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    value={parameters.dateRange.end}
                    onChange={(e) =>
                      setParameters({
                        ...parameters,
                        dateRange: {
                          ...parameters.dateRange,
                          end: e.target.value,
                        },
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format
                </label>
                <select
                  value={parameters.format}
                  onChange={(e) =>
                    setParameters({
                      ...parameters,
                      format: e.target.value as "csv" | "xlsx" | "pdf",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel (XLSX)</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={parameters.includeInactive}
                  onChange={(e) =>
                    setParameters({
                      ...parameters,
                      includeInactive: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Include inactive users
                </span>
              </label>
            </div>

            {/* Available Reports */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Available Reports</h4>
              {reportTypes.map((reportType) => {
                const Icon = reportType.icon;
                const isGenerating = generating === reportType.id;

                return (
                  <motion.div
                    key={reportType.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer"
                    onClick={() => !isGenerating && generateReport(reportType)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {reportType.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {reportType.description}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Est. time: {reportType.estimatedTime}
                        </div>
                      </div>
                      {isGenerating && <LoadingSpinner size="sm" />}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Generated Reports */}
        <Card className="lg:col-span-2">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Generated Reports
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" text="Loading reports..." />
              </div>
            ) : reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <ReportItem
                    key={report.id}
                    report={report}
                    onDownload={() => downloadReport(report)}
                    onView={() => {
                      // Implement report preview
                      toast.info("Report preview coming soon");
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No reports generated yet</p>
                <p className="text-sm mt-1">
                  Generate your first report to get started
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

interface ReportItemProps {
  report: GeneratedReport;
  onDownload: () => void;
  onView: () => void;
}

function ReportItem({ report, onDownload, onView }: ReportItemProps) {
  const getStatusIcon = () => {
    switch (report.status) {
      case "completed":
        return <DocumentTextIcon className="w-5 h-5 text-green-600" />;
      case "generating":
        return <LoadingSpinner size="sm" />;
      case "failed":
        return <DocumentTextIcon className="w-5 h-5 text-red-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (report.status) {
      case "completed":
        return "text-green-600";
      case "generating":
        return "text-blue-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300"
    >
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <div className="font-medium text-gray-900">{report.name}</div>
          <div className="text-sm text-gray-500">
            Created {new Date(report.createdAt).toLocaleDateString()} by{" "}
            {report.createdBy}
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className={`text-xs font-medium ${getStatusColor()}`}>
              {report.status.toUpperCase()}
            </span>
            {report.fileSize && (
              <span className="text-xs text-gray-500">
                {formatFileSize(report.fileSize)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {report.status === "completed" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onView}
              leftIcon={<EyeIcon className="w-4 h-4" />}
            >
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
            >
              Download
            </Button>
          </>
        )}
        {report.status === "generating" && (
          <span className="text-sm text-blue-600">Generating...</span>
        )}
        {report.status === "failed" && (
          <span className="text-sm text-red-600">Failed</span>
        )}
      </div>
    </motion.div>
  );
}
