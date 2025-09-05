'use client';

interface JobStatusBadgeProps {
  status: 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
}

const statusConfig = {
  applied: {
    label: 'Applied',
    classes: 'bg-blue-100 text-blue-800',
  },
  interview: {
    label: 'Interview',
    classes: 'bg-warning-100 text-warning-800',
  },
  offer: {
    label: 'Offer',
    classes: 'bg-success-100 text-success-800',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-error-100 text-error-800',
  },
  withdrawn: {
    label: 'Withdrawn',
    classes: 'bg-gray-100 text-gray-800',
  },
};

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`status-badge ${config.classes}`}>
      {config.label}
    </span>
  );
}