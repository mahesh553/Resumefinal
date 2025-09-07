"use client";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useErrorReporting } from "@/lib/errorReporting";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

interface AnalyticsMetrics {
  userGrowth: {
    current: number;
    previous: number;
    percentage: number;
  };
  resumeCreation: {
    current: number;
    previous: number;
    percentage: number;
  };
  applicationSubmission: {
    current: number;
    previous: number;
    percentage: number;
  };
  systemUsage: {
    avgSessionDuration: number;
    bounceRate: number;
    activeUsers: number;
  };
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
}

interface PopularFeature {
  name: string;
  usage: number;
  trend: "up" | "down" | "stable";
  percentage: number;
}

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

const timeRanges: TimeRange[] = [
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "Last year", value: "1y", days: 365 },
];

export function AdminAnalytics() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [popularFeatures, setPopularFeatures] = useState<PopularFeature[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("30d");
  const [loading, setLoading] = useState(true);
  const { reportError } = useErrorReporting();

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedTimeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch metrics
      const metricsResponse = await fetch(
        `/api/admin/analytics/metrics?range=${selectedTimeRange}`
      );
      if (!metricsResponse.ok) throw new Error("Failed to fetch metrics");
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

      // Fetch chart data
      const chartResponse = await fetch(
        `/api/admin/analytics/chart-data?range=${selectedTimeRange}`
      );
      if (!chartResponse.ok) throw new Error("Failed to fetch chart data");
      const chartData = await chartResponse.json();
      setChartData(chartData);

      // Fetch popular features
      const featuresResponse = await fetch(
        `/api/admin/analytics/popular-features?range=${selectedTimeRange}`
      );
      if (!featuresResponse.ok) throw new Error("Failed to fetch features");
      const featuresData = await featuresResponse.json();
      setPopularFeatures(featuresData);
    } catch (error) {
      reportError(error as Error, {
        metadata: { component: "AdminAnalytics", action: "fetchAnalyticsData" },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading analytics..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Insights and metrics for your platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <Button
            onClick={fetchAnalyticsData}
            variant="outline"
            leftIcon={<ArrowTrendingUpIcon className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="User Growth"
            current={metrics.userGrowth.current}
            previous={metrics.userGrowth.previous}
            percentage={metrics.userGrowth.percentage}
            icon={UsersIcon}
            color="blue"
          />
          <MetricCard
            title="Resume Creation"
            current={metrics.resumeCreation.current}
            previous={metrics.resumeCreation.previous}
            percentage={metrics.resumeCreation.percentage}
            icon={DocumentTextIcon}
            color="green"
          />
          <MetricCard
            title="Job Applications"
            current={metrics.applicationSubmission.current}
            previous={metrics.applicationSubmission.previous}
            percentage={metrics.applicationSubmission.percentage}
            icon={BriefcaseIcon}
            color="purple"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-1">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Platform Activity
            </h3>
            {chartData ? (
              <SimpleChart data={chartData} />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <ChartBarIcon className="w-12 h-12 mb-2" />
                <p>Chart data not available</p>
              </div>
            )}
          </div>
        </Card>

        {/* Popular Features */}
        <Card className="lg:col-span-1">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Popular Features
            </h3>
            <div className="space-y-4">
              {popularFeatures.map((feature, index) => (
                <FeatureItem key={index} feature={feature} />
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* System Usage Stats */}
      {metrics && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              System Usage Statistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter
                    end={metrics.systemUsage.avgSessionDuration}
                    suffix="min"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  Avg Session Duration
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter
                    end={metrics.systemUsage.bounceRate}
                    suffix="%"
                  />
                </div>
                <div className="text-sm text-gray-600">Bounce Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter end={metrics.systemUsage.activeUsers} />
                </div>
                <div className="text-sm text-gray-600">Active Users</div>
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
  current: number;
  previous: number;
  percentage: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "purple";
}

function MetricCard({
  title,
  current,
  previous,
  percentage,
  icon: Icon,
  color,
}: MetricCardProps) {
  const isPositive = percentage >= 0;
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl font-bold text-gray-900">
                <AnimatedCounter end={current} />
              </span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {Math.abs(percentage).toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500">vs previous period</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </Card>
  );
}

interface FeatureItemProps {
  feature: PopularFeature;
}

function FeatureItem({ feature }: FeatureItemProps) {
  const getTrendIcon = () => {
    switch (feature.trend) {
      case "up":
        return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />;
      case "down":
        return <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (feature.trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{feature.name}</div>
        <div className="text-sm text-gray-500">{feature.usage} uses</div>
      </div>
      <div className="flex items-center gap-2">
        {getTrendIcon()}
        <span className={`text-sm font-medium ${getTrendColor()}`}>
          {feature.percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

interface SimpleChartProps {
  data: ChartData;
}

function SimpleChart({ data }: SimpleChartProps) {
  // Simple bar chart implementation using CSS
  const maxValue = Math.max(
    ...data.datasets.flatMap((dataset) => dataset.data)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between h-48 border-b border-gray-200">
        {data.labels.map((label, index) => {
          const value = data.datasets[0]?.data[index] || 0;
          const height = (value / maxValue) * 100;

          return (
            <div
              key={index}
              className="flex flex-col items-center gap-2 flex-1"
            >
              <div className="relative w-full max-w-12">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="bg-primary-500 rounded-t-sm w-full"
                  style={{ minHeight: height > 0 ? "4px" : "0" }}
                />
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                  {value}
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                {label.length > 6 ? label.slice(0, 6) + "..." : label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary-500 rounded-sm" />
          <span className="text-sm text-gray-600">
            {data.datasets[0]?.label || "Activity"}
          </span>
        </div>
      </div>
    </div>
  );
}
