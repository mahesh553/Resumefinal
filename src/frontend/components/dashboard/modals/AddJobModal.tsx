"use client";

import { Button } from "@/components/ui/Button";
import {
  Modal,
  ModalBody,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";
import { useCreateJob } from "@/hooks/api";
import {
  BriefcaseIcon,
  CalendarIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";

interface JobFormData {
  vendorName: string;
  jobTitle: string;
  location?: string;
  salaryRange?: string;
  jobDescription?: string;
  applicationUrl?: string;
  appliedDate: string;
  followUpDate?: string;
  interviewDate?: string;
  notes?: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobAdded: () => void;
}

export function AddJobModal({ isOpen, onClose, onJobAdded }: AddJobModalProps) {
  const createJobMutation = useCreateJob();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<JobFormData>({
    defaultValues: {
      appliedDate: new Date().toISOString().split("T")[0], // Today's date
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: JobFormData) => {
    try {
      // Clean up empty optional fields while preserving required fields
      const cleanedData: Partial<JobFormData> & {
        vendorName: string;
        jobTitle: string;
        appliedDate: string;
      } = {
        vendorName: data.vendorName,
        jobTitle: data.jobTitle,
        appliedDate: data.appliedDate,
      };

      // Add optional fields only if they have values
      if (data.location) cleanedData.location = data.location;
      if (data.salaryRange) cleanedData.salaryRange = data.salaryRange;
      if (data.jobDescription) cleanedData.jobDescription = data.jobDescription;
      if (data.applicationUrl) cleanedData.applicationUrl = data.applicationUrl;
      if (data.followUpDate) cleanedData.followUpDate = data.followUpDate;
      if (data.interviewDate) cleanedData.interviewDate = data.interviewDate;
      if (data.notes) cleanedData.notes = data.notes;
      if (data.contactEmail) cleanedData.contactEmail = data.contactEmail;
      if (data.contactPhone) cleanedData.contactPhone = data.contactPhone;

      await createJobMutation.mutateAsync(cleanedData);
      onJobAdded();
      handleClose();
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Failed to create job:', error);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const appliedDate = watch("appliedDate");

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>
          <ModalTitle>Add New Job Application</ModalTitle>
          <ModalDescription>
            Track your job application details and follow-up schedule.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-6">
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
              Contact Information (Optional)
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
            disabled={createJobMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            loading={createJobMutation.isPending} 
            disabled={createJobMutation.isPending}
          >
            {createJobMutation.isPending ? "Adding Job..." : "Add Job Application"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
