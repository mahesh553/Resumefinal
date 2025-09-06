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
import { formatDate } from "@/lib/utils";
import type { Job } from "@/types";
import {
  BriefcaseIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

interface ViewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  job: Job | null;
}

export function ViewJobModal({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  job,
}: ViewJobModalProps) {
  if (!job) return null;

  const handleEdit = () => {
    onClose();
    onEdit();
  };

  const handleDelete = () => {
    onClose();
    onDelete();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <div className="flex items-start justify-between">
          <div>
            <ModalTitle>{job.jobTitle || job.title}</ModalTitle>
            <ModalDescription>
              <div className="flex items-center gap-2 mt-1">
                <BriefcaseIcon className="w-4 h-4" />
                {job.vendorName || job.company}
              </div>
            </ModalDescription>
          </div>
          <JobStatusBadge status={job.status} />
        </div>
      </ModalHeader>

      <ModalBody className="space-y-6">
        {/* Basic Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Job Details
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                {job.location && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{job.location}</span>
                  </div>
                )}
                {job.salaryRange && (
                  <div className="flex items-center gap-2">
                    <BriefcaseIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{job.salaryRange}</span>
                  </div>
                )}
                {job.applicationUrl && (
                  <div className="flex items-center gap-2">
                    <GlobeAltIcon className="w-4 h-4 flex-shrink-0" />
                    <a
                      href={job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-800 underline break-all"
                    >
                      View Job Posting
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            {(job.contactEmail || job.contactPhone) && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Contact Information
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  {job.contactEmail && (
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
                      <a
                        href={`mailto:${job.contactEmail}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {job.contactEmail}
                      </a>
                    </div>
                  )}
                  {job.contactPhone && (
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 flex-shrink-0" />
                      <a
                        href={`tel:${job.contactPhone}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {job.contactPhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Timeline
              </h3>
              <div className="space-y-3">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-blue-900">
                      Applied
                    </div>
                    <div className="text-xs text-blue-700">
                      {formatDate(job.appliedDate || job.applicationDate)}
                    </div>
                  </div>
                </motion.div>

                {job.followUpDate && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium text-yellow-900">
                        Follow-up Scheduled
                      </div>
                      <div className="text-xs text-yellow-700">
                        {formatDate(job.followUpDate)}
                      </div>
                    </div>
                  </motion.div>
                )}

                {job.interviewDate && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium text-green-900">
                        Interview Scheduled
                      </div>
                      <div className="text-xs text-green-700">
                        {formatDate(job.interviewDate)}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Job Description */}
        {(job.jobDescription || job.description) && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Job Description
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {job.jobDescription || job.description}
              </pre>
            </div>
          </div>
        )}

        {/* Requirements (if available as array) */}
        {job.requirements && job.requirements.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Requirements
            </h3>
            <ul className="bg-gray-50 rounded-lg p-4 space-y-2">
              {job.requirements.map((req, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes */}
        {job.notes && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Notes</h3>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm text-amber-800 italic">"{job.notes}"</p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
            <div>
              <span className="font-medium">Created:</span>{" "}
              {formatDate(job.createdAt)}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>{" "}
              {formatDate(job.updatedAt)}
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            onClick={handleDelete}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleEdit}>
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}
