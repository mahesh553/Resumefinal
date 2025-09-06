"use client";

import { Button } from "@/components/ui/Button";
import type { Job } from "@/types";
import {
  CheckIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";

interface BulkOperationsProps {
  selectedJobs: string[];
  allJobs: Job[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: string) => void;
  onBulkDelete: () => void;
  onExport: () => void;
}

const BULK_STATUS_OPTIONS = [
  { value: "applied", label: "Applied", color: "blue" },
  { value: "under_review", label: "Under Review", color: "purple" },
  {
    value: "interview_scheduled",
    label: "Interview Scheduled",
    color: "yellow",
  },
  {
    value: "interview_completed",
    label: "Interview Completed",
    color: "orange",
  },
  { value: "offer_received", label: "Offer Received", color: "green" },
  { value: "rejected", label: "Rejected", color: "red" },
  { value: "withdrawn", label: "Withdrawn", color: "gray" },
];

export function BulkOperations({
  selectedJobs,
  allJobs,
  onSelectAll,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkDelete,
  onExport,
}: BulkOperationsProps) {
  const selectedCount = selectedJobs.length;
  const totalJobs = allJobs.length;
  const isAllSelected = selectedCount === totalJobs && totalJobs > 0;

  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center">
                <CheckIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-primary-900">
                {selectedCount} of {totalJobs} jobs selected
              </span>
            </div>

            {!isAllSelected && totalJobs > selectedCount && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
                className="text-primary-700 hover:text-primary-800"
              >
                Select all {totalJobs}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk Status Update */}
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onBulkStatusUpdate(e.target.value);
                    e.target.value = ""; // Reset selection
                  }
                }}
                className="px-3 py-1.5 text-sm border border-primary-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Update Status</option>
                {BULK_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="border-primary-300 text-primary-700 hover:bg-primary-100"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
              Export
            </Button>

            {/* Bulk Delete */}
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkDelete}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              Delete
            </Button>

            {/* Clear Selection */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-primary-700 hover:text-primary-800"
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
