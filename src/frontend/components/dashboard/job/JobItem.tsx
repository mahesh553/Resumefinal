"use client";

import { Button } from "@/components/ui/Button";
import { JobStatusBadge } from "@/components/ui/JobStatusBadge";
import { formatDate } from "@/lib/utils";
import type { Job } from "@/types";
import {
  BriefcaseIcon,
  CalendarIcon,
  EnvelopeIcon,
  EyeIcon,
  GlobeAltIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

interface JobItemProps {
  job: Job;
  index: number;
  isSelected: boolean;
  onSelect: (jobId: string, selected: boolean) => void;
  onView: (job: Job) => void;
  onEdit: (job: Job) => void;
  onDelete: (jobId: string) => void;
  searchTerm?: string;
}

export function JobItem({
  job,
  index,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  searchTerm = "",
}: JobItemProps) {
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;

    const regex = new RegExp(`(${search})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const isOverdue = (date: string) => {
    return (
      new Date(date) < new Date() &&
      new Date(date).toDateString() !== new Date().toDateString()
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`bg-white border rounded-xl p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1 ${
        isSelected
          ? "border-primary-300 bg-primary-25 shadow-md"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Selection Checkbox */}
        <div className="flex items-center pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(job.id, e.target.checked)}
            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
          />
        </div>

        {/* Job Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {highlightText(job.jobTitle, searchTerm)}
              </h3>
              <p className="text-primary-600 font-medium">
                {highlightText(job.vendorName, searchTerm)}
              </p>
            </div>
            <JobStatusBadge status={job.status} />
          </div>

          {/* Job Details */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {job.location && (
                  <div className="flex items-center gap-1">
                    <MapPinIcon className="w-4 h-4" />
                    {highlightText(job.location, searchTerm)}
                  </div>
                )}
                {job.salaryRange && (
                  <div className="flex items-center gap-1">
                    <BriefcaseIcon className="w-4 h-4" />
                    {job.salaryRange}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  Applied {formatDate(job.appliedDate)}
                </div>
              </div>
            </div>

            {/* Contact & Links */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {job.applicationUrl && (
                  <a
                    href={job.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-800"
                  >
                    <GlobeAltIcon className="w-4 h-4" />
                    Job Posting
                  </a>
                )}
                {job.contactEmail && (
                  <a
                    href={`mailto:${job.contactEmail}`}
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-800"
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                    Contact
                  </a>
                )}
                {job.contactPhone && (
                  <a
                    href={`tel:${job.contactPhone}`}
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-800"
                  >
                    <PhoneIcon className="w-4 h-4" />
                    Call
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {job.notes && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-lg">
                "{job.notes}"
              </p>
            </div>
          )}

          {/* Important Dates */}
          {(job.followUpDate || job.interviewDate) && (
            <div className="flex flex-wrap gap-4 text-sm mb-4">
              {job.followUpDate && (
                <div
                  className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                    isOverdue(job.followUpDate)
                      ? "bg-red-100 text-red-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Follow up: {formatDate(job.followUpDate)}
                  {isOverdue(job.followUpDate) && (
                    <span className="ml-1 font-medium">(Overdue)</span>
                  )}
                </div>
              )}
              {job.interviewDate && (
                <div
                  className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                    isOverdue(job.interviewDate)
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Interview: {formatDate(job.interviewDate)}
                  {isOverdue(job.interviewDate) && (
                    <span className="ml-1 font-medium">(Past)</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onView(job)}>
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(job)}>
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(job.id)}
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
