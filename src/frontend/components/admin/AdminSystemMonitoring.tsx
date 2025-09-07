"use client";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useErrorReporting } from "@/lib/errorReporting";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ClockIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

interface HealthStatus {
  service: string;
  status: "healthy" | "warning" | "error";
  responseTime: number;
  lastChecked: Date;
  details?: string;
  uptime: number;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connections: number;
    maxConnections: number;
    avgQueryTime: number;
  };
  api: {
    requestsPerMinute: number;
    avgResponseTime: number;
    errorRate: number;
  };
}

interface ErrorLog {
  id: string;
  timestamp: Date;
  level: "error" | "warning" | "info";
  service: string;
  message: string;
  stack?: string;
  count: number;
}

export function AdminSystemMonitoring() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(
    null
  );
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { reportError } = useErrorReporting();

  useEffect(() => {
    fetchMonitoringData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);

      // Fetch health status
      const healthResponse = await fetch("/api/admin/system/health");
      if (!healthResponse.ok) throw new Error("Failed to fetch health status");
      const healthData = await healthResponse.json();
      setHealthStatus(healthData);

      // Fetch system metrics
      const metricsResponse = await fetch("/api/admin/system/metrics");
      if (!metricsResponse.ok) throw new Error("Failed to fetch metrics");
      const metricsData = await metricsResponse.json();
      setSystemMetrics(metricsData);

      // Fetch error logs
      const logsResponse = await fetch("/api/admin/system/error-logs?limit=20");
      if (!logsResponse.ok) throw new Error("Failed to fetch error logs");
      const logsData = await logsResponse.json();
      setErrorLogs(logsData);

      setLastUpdate(new Date());
    } catch (error) {
      reportError(error as Error, {
        metadata: {
          component: "AdminSystemMonitoring",
          action: "fetchMonitoringData",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const getOverallSystemHealth = () => {
    if (healthStatus.length === 0) return "unknown";

    const hasError = healthStatus.some((service) => service.status === "error");
    const hasWarning = healthStatus.some(
      (service) => service.status === "warning"
    );

    if (hasError) return "error";
    if (hasWarning) return "warning";
    return "healthy";
  };

  const overallHealth = getOverallSystemHealth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            System Monitoring
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time system health and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button
            onClick={fetchMonitoringData}
            variant="outline"
            leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health Status */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {overallHealth === "healthy" && (
                <CheckCircleIcon className="w-12 h-12 text-green-500" />
              )}
              {overallHealth === "warning" && (
                <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500" />
              )}
              {overallHealth === "error" && (
                <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />
              )}
              {overallHealth === "unknown" && (
                <ClockIcon className="w-12 h-12 text-gray-500" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                System Status:{" "}
                <span
                  className={
                    overallHealth === "healthy"
                      ? "text-green-600"
                      : overallHealth === "warning"
                        ? "text-yellow-600"
                        : overallHealth === "error"
                          ? "text-red-600"
                          : "text-gray-600"
                  }
                >
                  {overallHealth.charAt(0).toUpperCase() +
                    overallHealth.slice(1)}
                </span>
              </h3>
              <p className="text-gray-600 mt-1">
                {overallHealth === "healthy"
                  ? "All systems are operating normally"
                  : overallHealth === "warning"
                    ? "Some services are experiencing issues"
                    : overallHealth === "error"
                      ? "Critical issues detected"
                      : "System status unknown"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Service Health Status */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Service Health Status
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" text="Checking services..." />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthStatus.map((service) => (
                <ServiceHealthCard key={service.service} service={service} />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* System Metrics */}
      {systemMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                System Performance
              </h3>
              <div className="space-y-4">
                <MetricItem
                  icon={CpuChipIcon}
                  label="CPU Usage"
                  value={systemMetrics.cpu.usage}
                  unit="%"
                  color={
                    systemMetrics.cpu.usage > 80
                      ? "red"
                      : systemMetrics.cpu.usage > 60
                        ? "yellow"
                        : "green"
                  }
                />
                <MetricItem
                  icon={CircleStackIcon}
                  label="Memory Usage"
                  value={systemMetrics.memory.percentage}
                  unit="%"
                  color={
                    systemMetrics.memory.percentage > 80
                      ? "red"
                      : systemMetrics.memory.percentage > 60
                        ? "yellow"
                        : "green"
                  }
                />
                <MetricItem
                  icon={ServerIcon}
                  label="Database Connections"
                  value={systemMetrics.database.connections}
                  maxValue={systemMetrics.database.maxConnections}
                  color={
                    systemMetrics.database.connections /
                      systemMetrics.database.maxConnections >
                    0.8
                      ? "red"
                      : "green"
                  }
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                API Performance
              </h3>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    <AnimatedCounter
                      end={systemMetrics.api.requestsPerMinute}
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    Requests per minute
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    <AnimatedCounter
                      end={systemMetrics.api.avgResponseTime}
                      suffix="ms"
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    Average response time
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    <AnimatedCounter
                      end={systemMetrics.api.errorRate}
                      suffix="%"
                    />
                  </div>
                  <div className="text-sm text-gray-600">Error rate</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Recent Error Logs */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Error Logs
          </h3>
          {errorLogs.length > 0 ? (
            <div className="space-y-3">
              {errorLogs.map((log) => (
                <ErrorLogItem key={log.id} log={log} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No recent errors - system is running smoothly!</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

interface ServiceHealthCardProps {
  service: HealthStatus;
}

function ServiceHealthCard({ service }: ServiceHealthCardProps) {
  const getStatusIcon = () => {
    switch (service.status) {
      case "healthy":
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case "warning":
        return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />;
      case "error":
        return <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />;
      default:
        return <ClockIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (service.status) {
      case "healthy":
        return "border-green-200 bg-green-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "error":
        return "border-red-200 bg-red-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border-2 ${getStatusColor()}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{service.service}</h4>
        {getStatusIcon()}
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <div>Response: {service.responseTime}ms</div>
        <div>Uptime: {service.uptime.toFixed(2)}%</div>
        <div className="text-xs text-gray-500">
          Last checked: {new Date(service.lastChecked).toLocaleTimeString()}
        </div>
        {service.details && (
          <div className="text-xs text-gray-600 mt-2">{service.details}</div>
        )}
      </div>
    </motion.div>
  );
}

interface MetricItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  unit?: string;
  maxValue?: number;
  color: "green" | "yellow" | "red";
}

function MetricItem({
  icon: Icon,
  label,
  value,
  unit,
  maxValue,
  color,
}: MetricItemProps) {
  const colorClasses = {
    green: "text-green-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-gray-600" />
        <span className="font-medium text-gray-900">{label}</span>
      </div>
      <div className={`font-bold ${colorClasses[color]}`}>
        <AnimatedCounter end={value} suffix={unit} />
        {maxValue && (
          <span className="text-gray-500 font-normal"> / {maxValue}</span>
        )}
      </div>
    </div>
  );
}

interface ErrorLogItemProps {
  log: ErrorLog;
}

function ErrorLogItem({ log }: ErrorLogItemProps) {
  const getLevelColor = () => {
    switch (log.level) {
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "info":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getLevelColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{log.service}</span>
          <span className="text-sm px-2 py-1 rounded-full bg-white border">
            {log.level.toUpperCase()}
          </span>
          {log.count > 1 && (
            <span className="text-xs px-2 py-1 rounded-full bg-white border">
              {log.count}x
            </span>
          )}
        </div>
        <span className="text-sm">
          {new Date(log.timestamp).toLocaleString()}
        </span>
      </div>
      <p className="text-sm">{log.message}</p>
      {log.stack && (
        <details className="mt-2">
          <summary className="text-xs cursor-pointer text-gray-600 hover:text-gray-800">
            Show stack trace
          </summary>
          <pre className="text-xs mt-2 p-2 bg-white border rounded overflow-x-auto">
            {log.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
