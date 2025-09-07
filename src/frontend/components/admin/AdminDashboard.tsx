"use client";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useErrorReporting } from "@/lib/errorReporting";
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalResumes: number;
  totalApplications: number;
  systemHealth: number;
  avgResponseTime: number;
  errorRate: number;
  recentSignups: number;
}

interface RecentActivity {
  id: string;
  type:
    | "user_signup"
    | "resume_created"
    | "application_submitted"
    | "error_occurred";
  user: {
    name: string;
    email: string;
  };
  timestamp: Date;
  metadata?: any;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: "users",
    label: "Manage Users",
    description: "View and manage user accounts",
    href: "/admin/users",
    icon: UsersIcon,
    color: "blue",
  },
  {
    id: "analytics",
    label: "View Analytics",
    description: "Check system metrics and insights",
    href: "/admin/analytics",
    icon: ChartBarIcon,
    color: "green",
  },
  {
    id: "monitoring",
    label: "System Health",
    description: "Monitor system performance",
    href: "/admin/monitoring",
    icon: ExclamationTriangleIcon,
    color: "yellow",
  },
  {
    id: "reports",
    label: "Generate Reports",
    description: "Create and download reports",
    href: "/admin/reports",
    icon: DocumentTextIcon,
    color: "purple",
  },
];

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { reportError } = useErrorReporting();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch system metrics
      const metricsResponse = await fetch(
        "/api/admin/analytics/system-metrics"
      );
      if (!metricsResponse.ok) {
        throw new Error("Failed to fetch metrics");
      }
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

      // Fetch recent activity
      const activityResponse = await fetch(
        "/api/admin/analytics/recent-activity"
      );
      if (!activityResponse.ok) {
        throw new Error("Failed to fetch activity");
      }
      const activityData = await activityResponse.json();
      setRecentActivity(activityData);
    } catch (error) {
      reportError(error as Error, {
        metadata: { component: "AdminDashboard", action: "fetchDashboardData" },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Overview of your QoderResume platform
          </p>
        </div>
        <Button
          onClick={fetchDashboardData}
          variant="outline"
          leftIcon={<ArrowTrendingUpIcon className="w-4 h-4" />}
        >
          Refresh Data
        </Button>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Users"
            value={metrics.totalUsers}
            change={metrics.recentSignups}
            changeLabel="new this week"
            icon={UsersIcon}
            color="blue"
          />
          <MetricCard
            title="Active Users"
            value={metrics.activeUsers}
            percentage={(metrics.activeUsers / metrics.totalUsers) * 100}
            icon={UsersIcon}
            color="green"
          />
          <MetricCard
            title="Total Resumes"
            value={metrics.totalResumes}
            icon={DocumentTextIcon}
            color="purple"
          />
          <MetricCard
            title="System Health"
            value={metrics.systemHealth}
            unit="%"
            icon={ExclamationTriangleIcon}
            color={
              metrics.systemHealth > 90
                ? "green"
                : metrics.systemHealth > 70
                  ? "yellow"
                  : "red"
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <QuickActionItem key={action.id} action={action} />
              ))}
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h3>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.slice(0, 8).map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClockIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Performance Overview */}
      {metrics && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Performance Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.avgResponseTime}ms
                </div>
                <div className="text-sm text-gray-600">
                  Average Response Time
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.errorRate.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-600">Error Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.totalApplications}
                </div>
                <div className="text-sm text-gray-600">Total Applications</div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  changeLabel?: string;
  percentage?: number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "purple" | "yellow" | "red";
}

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  percentage,
  unit = "",
  icon: Icon,
  color,
}: MetricCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl font-bold text-gray-900">
                <AnimatedCounter end={value} suffix={unit} />
              </span>
            </div>
            {change !== undefined && changeLabel && (
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium text-green-600">+{change}</span>{" "}
                {changeLabel}
              </p>
            )}
            {percentage !== undefined && (
              <p className="text-sm text-gray-500 mt-1">
                {percentage.toFixed(1)}% of total
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </Card>
  );
}

interface QuickActionItemProps {
  action: QuickAction;
}

function QuickActionItem({ action }: QuickActionItemProps) {
  const Icon = action.icon;

  const colorClasses = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    purple: "text-purple-600 bg-purple-50",
    yellow: "text-yellow-600 bg-yellow-50",
  };

  return (
    <motion.a
      href={action.href}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
    >
      <div
        className={`p-2 rounded-lg ${colorClasses[action.color as keyof typeof colorClasses]}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900">{action.label}</div>
        <div className="text-xs text-gray-600">{action.description}</div>
      </div>
    </motion.a>
  );
}

interface ActivityItemProps {
  activity: RecentActivity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_signup":
        return <UsersIcon className="w-4 h-4 text-green-600" />;
      case "resume_created":
        return <DocumentTextIcon className="w-4 h-4 text-blue-600" />;
      case "application_submitted":
        return <ChartBarIcon className="w-4 h-4 text-purple-600" />;
      case "error_occurred":
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityMessage = (type: string) => {
    switch (type) {
      case "user_signup":
        return "signed up";
      case "resume_created":
        return "created a resume";
      case "application_submitted":
        return "submitted an application";
      case "error_occurred":
        return "encountered an error";
      default:
        return "performed an action";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-shrink-0">{getActivityIcon(activity.type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{activity.user.name}</span>{" "}
          {getActivityMessage(activity.type)}
        </p>
        <p className="text-xs text-gray-500 truncate">{activity.user.email}</p>
      </div>
      <div className="text-xs text-gray-500 whitespace-nowrap">
        {formatTime(activity.timestamp)}
      </div>
    </div>
  );
}
