"use client";

import { Button } from "@/components/ui/Button";
import { JobStatusBadge } from "@/components/ui/JobStatusBadge";
import {
  Modal,
  ModalBody,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";
import { useUpdateJob } from "@/hooks/api";
import type { Job } from "@/types";
import {
  BriefcaseIcon,
  CalendarIcon,
  ChevronRightIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";

interface JobFormData {
  vendorName: string;
  jobTitle: string;
  location?: string;
  salaryRange?: string;
  jobDescription?: string;
  applicationUrl?: string;
  status: string;
  appliedDate: string;
  followUpDate?: string;
  interviewDate?: string;
  notes?: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobUpdated: () => void;
  job: Job | null;
}

const STATUS_FLOW = [
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

export function EditJobModal({
  isOpen,
  onClose,
  onJobUpdated,
  job,
}: EditJobModalProps) {
  const [showStatusProgression, setShowStatusProgression] = useState(false);
  const updateJobMutation = useUpdateJob();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<JobFormData>();

  // Reset form when job changes
  useEffect(() => {
    if (job) {
      reset({
        vendorName: job.vendorName || job.company,
        jobTitle: job.jobTitle || job.title,
        location: job.location || "",
        salaryRange: job.salaryRange || "",
        jobDescription: job.jobDescription || job.description || "",
        applicationUrl: job.applicationUrl || "",
        status: job.status,
        appliedDate: job.appliedDate
          ? new Date(job.appliedDate).toISOString().split("T")[0]
          : "",
        followUpDate: job.followUpDate
          ? new Date(job.followUpDate).toISOString().split("T")[0]
          : "",
        interviewDate: job.interviewDate
          ? new Date(job.interviewDate).toISOString().split("T")[0]
          : "",
        notes: job.notes || "",
        contactEmail: job.contactEmail || "",
        contactPhone: job.contactPhone || "",
      });
    }
  }, [job, reset]);

  const handleClose = () => {
    reset();
    setShowStatusProgression(false);
    onClose();
  };

  const onSubmit = async (data: JobFormData) => {
    if (!job) return;

    try {
      // Clean up empty optional fields
      const cleanedData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== "")
      );

      await updateJobMutation.mutateAsync({
        jobId: job.id,
        updates: cleanedData,
      });
      
      onJobUpdated();
      handleClose();
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Failed to update job:', error);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setValue("status", newStatus);

    // Auto-set dates based on status progression
    if (newStatus === "interview_scheduled" && !watch("interviewDate")) {
      // Set interview date to tomorrow if not already set
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setValue("interviewDate", tomorrow.toISOString().split("T")[0]);
    }

    if (newStatus === "under_review" && !watch("followUpDate")) {
      // Set follow-up date to a week from now
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setValue("followUpDate", nextWeek.toISOString().split("T")[0]);
    }

    setShowStatusProgression(false);
  };

  const getNextStatuses = () => {
    const currentStatus = watch("status");

    // Allow progression to next logical statuses
    if (currentStatus === "applied") {
      return ["under_review", "interview_scheduled", "rejected", "withdrawn"];
    }
    if (currentStatus === "under_review") {
      return ["interview_scheduled", "rejected", "withdrawn"];
    }
    if (currentStatus === "interview_scheduled") {
      return ["interview_completed", "rejected", "withdrawn"];
    }
    if (currentStatus === "interview_completed") {
      return ["offer_received", "rejected", "withdrawn"];
    }

    // Terminal states can only change to withdrawn (if not already)
    if (["offer_received", "rejected"].includes(currentStatus)) {
      return currentStatus === "withdrawn" ? [] : ["withdrawn"];
    }

    return [];
  };

  const today = new Date().toISOString().split("T")[0];
  const appliedDate = watch("appliedDate");
  const currentStatus = watch("status");

  if (!job) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>
          <ModalTitle>Edit Job Application</ModalTitle>
          <ModalDescription>
            Update your job application details and track progress.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-6">
          {/* Status Management */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">
                Application Status
              </h3>
              <JobStatusBadge status={currentStatus as any} />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowStatusProgression(!showStatusProgression)}
              >
                Update Status
                <ChevronRightIcon
                  className={`ml-1 w-4 h-4 transform transition-transform ${showStatusProgression ? "rotate-90" : ""}`}
                />
              </Button>
            </div>

            {showStatusProgression && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <p className="text-xs text-gray-600 mb-2">
                  Choose next status:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {getNextStatuses().map((statusValue) => {
                    const status = STATUS_FLOW.find(
                      (s) => s.value === statusValue
                    );
                    return (
                      <button
                        key={statusValue}
                        type="button"
                        onClick={() => handleStatusChange(statusValue)}
                        className={`p-2 text-xs rounded-lg border-2 border-dashed hover:border-solid transition-all ${
                          status?.color === "green"
                            ? "border-green-300 hover:bg-green-50 text-green-700"
                            : status?.color === "red"
                              ? "border-red-300 hover:bg-red-50 text-red-700"
                              : status?.color === "yellow"
                                ? "border-yellow-300 hover:bg-yellow-50 text-yellow-700"
                                : status?.color === "orange"
                                  ? "border-orange-300 hover:bg-orange-50 text-orange-700"
                                  : status?.color === "purple"
                                    ? "border-purple-300 hover:bg-purple-50 text-purple-700"
                                    : "border-gray-300 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        {status?.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Basic Job Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <div className="relative">
                <BriefcaseIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register("vendorName", {
                    required: "Company name is required",
                    maxLength: {
                      value: 100,
                      message: "Company name is too long",
                    },
                  })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter company name"
                />
              </div>
              {errors.vendorName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.vendorName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                {...register("jobTitle", {
                  required: "Job title is required",
                  maxLength: { value: 100, message: "Job title is too long" },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter job title"
              />
              {errors.jobTitle && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.jobTitle.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register("location", {
                    maxLength: { value: 100, message: "Location is too long" },
                  })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="City, State or Remote"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salary Range
              </label>
              <input
                {...register("salaryRange", {
                  maxLength: { value: 50, message: "Salary range is too long" },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., $80k - $120k"
              />
            </div>
          </div>

          {/* Application Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Description / Requirements
            </label>
            <textarea
              {...register("jobDescription", {
                maxLength: { value: 5000, message: "Description is too long" },
              })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical"
              placeholder="Paste job description or key requirements..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Application URL
            </label>
            <input
              {...register("applicationUrl", {
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: "Please enter a valid URL",
                },
              })}
              type="url"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://company.com/careers/job-id"
            />
            {errors.applicationUrl && (
              <p className="text-red-500 text-xs mt-1">
                {errors.applicationUrl.message}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="inline w-4 h-4 mr-1" />
                Application Date *
              </label>
              <input
                {...register("appliedDate", {
                  required: "Application date is required",
                })}
                type="date"
                max={today}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.appliedDate && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.appliedDate.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="inline w-4 h-4 mr-1" />
                Follow-up Date
              </label>
              <input
                {...register("followUpDate")}
                type="date"
                min={appliedDate || today}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="inline w-4 h-4 mr-1" />
                Interview Date
              </label>
              <input
                {...register("interviewDate")}
                type="date"
                min={appliedDate || today}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Contact Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email
                </label>
                <input
                  {...register("contactEmail", {
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Please enter a valid email",
                    },
                    maxLength: { value: 100, message: "Email is too long" },
                  })}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="recruiter@company.com"
                />
                {errors.contactEmail && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.contactEmail.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <input
                  {...register("contactPhone", {
                    maxLength: {
                      value: 20,
                      message: "Phone number is too long",
                    },
                  })}
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              {...register("notes", {
                maxLength: { value: 1000, message: "Notes are too long" },
              })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical"
              placeholder="Additional notes about this application..."
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={updateJobMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            loading={updateJobMutation.isPending} 
            disabled={updateJobMutation.isPending}
          >
            {updateJobMutation.isPending ? "Updating..." : "Update Job Application"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
