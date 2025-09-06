"use client";

interface JobStatusBadgeProps {
  status:
    | "applied"
    | "under_review"
    | "interview_scheduled"
    | "interview_completed"
    | "offer_received"
    | "rejected"
    | "withdrawn";
}

const statusConfig = {
  applied: {
    label: "Applied",
    classes: "bg-blue-100 text-blue-800",
    icon: "📝",
  },
  under_review: {
    label: "Under Review",
    classes: "bg-purple-100 text-purple-800",
    icon: "👀",
  },
  interview_scheduled: {
    label: "Interview Scheduled",
    classes: "bg-yellow-100 text-yellow-800",
    icon: "📅",
  },
  interview_completed: {
    label: "Interview Completed",
    classes: "bg-orange-100 text-orange-800",
    icon: "✅",
  },
  offer_received: {
    label: "Offer Received",
    classes: "bg-green-100 text-green-800",
    icon: "🎉",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-red-100 text-red-800",
    icon: "❌",
  },
  withdrawn: {
    label: "Withdrawn",
    classes: "bg-gray-100 text-gray-800",
    icon: "⏹️",
  },
};

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return (
      <span className="status-badge bg-gray-100 text-gray-800">
        Unknown Status
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.classes}`}
    >
      <span className="text-sm">{config.icon}</span>
      {config.label}
    </span>
  );
}
