import { formatDate } from "@/lib/utils";
import type { Job } from "@/types";

export interface ExportOptions {
  format: "csv" | "json";
  includeFields: string[];
}

const DEFAULT_FIELDS = [
  "jobTitle",
  "vendorName",
  "location",
  "status",
  "salaryRange",
  "appliedDate",
  "followUpDate",
  "interviewDate",
  "notes",
  "contactEmail",
  "contactPhone",
  "applicationUrl",
];

const FIELD_LABELS: Record<string, string> = {
  jobTitle: "Job Title",
  vendorName: "Company",
  location: "Location",
  status: "Status",
  salaryRange: "Salary Range",
  appliedDate: "Applied Date",
  followUpDate: "Follow-up Date",
  interviewDate: "Interview Date",
  notes: "Notes",
  contactEmail: "Contact Email",
  contactPhone: "Contact Phone",
  applicationUrl: "Application URL",
};

export function exportJobsToCSV(
  jobs: Job[],
  options?: Partial<ExportOptions>
): void {
  const fields = options?.includeFields || DEFAULT_FIELDS;

  // Create CSV header
  const header = fields.map((field) => FIELD_LABELS[field] || field).join(",");

  // Create CSV rows
  const rows = jobs.map((job) => {
    return fields
      .map((field) => {
        let value = job[field as keyof Job] || "";

        // Format dates
        if (field.includes("Date") && value) {
          value = formatDate(value as string);
        }

        // Escape commas and quotes in CSV
        if (typeof value === "string") {
          value = value.replace(/"/g, '""');
          if (
            value.includes(",") ||
            value.includes('"') ||
            value.includes("\n")
          ) {
            value = `"${value}"`;
          }
        }

        return value;
      })
      .join(",");
  });

  const csvContent = [header, ...rows].join("\n");
  downloadFile(csvContent, "job-applications.csv", "text/csv");
}

export function exportJobsToJSON(
  jobs: Job[],
  options?: Partial<ExportOptions>
): void {
  const fields = options?.includeFields || DEFAULT_FIELDS;

  const exportData = jobs.map((job) => {
    const filteredJob: Record<string, any> = {};
    fields.forEach((field) => {
      if (job[field as keyof Job] !== undefined) {
        filteredJob[field] = job[field as keyof Job];
      }
    });
    return filteredJob;
  });

  const jsonContent = JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      totalJobs: jobs.length,
      jobs: exportData,
    },
    null,
    2
  );

  downloadFile(jsonContent, "job-applications.json", "application/json");
}

export function exportJobs(
  jobs: Job[],
  format: "csv" | "json" = "csv",
  options?: Partial<ExportOptions>
): void {
  if (jobs.length === 0) {
    alert("No jobs to export");
    return;
  }

  try {
    if (format === "csv") {
      exportJobsToCSV(jobs, options);
    } else {
      exportJobsToJSON(jobs, options);
    }
  } catch (error) {
    console.error("Export error:", error);
    alert("Failed to export jobs. Please try again.");
  }
}

function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getExportableFields(): Array<{ value: string; label: string }> {
  return DEFAULT_FIELDS.map((field) => ({
    value: field,
    label: FIELD_LABELS[field] || field,
  }));
}
