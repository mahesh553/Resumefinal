"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal, ModalHeader, ModalTitle } from "@/components/ui/Modal";
import { useErrorReporting } from "@/lib/errorReporting";
import {
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  KeyIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

// Types
interface SecurityEvent {
  id: string;
  type:
    | "login"
    | "logout"
    | "failed_login"
    | "password_change"
    | "role_change"
    | "permission_change"
    | "api_access";
  user: {
    id: string;
    email: string;
    role: string;
  };
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  details?: Record<string, any>;
}

interface ActiveSession {
  id: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  createdAt: Date;
  lastActivity: Date;
  isCurrentSession: boolean;
}

interface SecuritySettings {
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  requireMFA: boolean;
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireUppercase: boolean;
  loginNotifications: boolean;
  suspiciousActivityAlerts: boolean;
}

interface SecurityStats {
  totalLogins: number;
  failedLogins: number;
  activeSessions: number;
  securityIncidents: number;
  lastSecurityScan: Date | null;
}

export function AdminSecurity() {
  // State management
  const [activeTab, setActiveTab] = useState<
    "overview" | "events" | "sessions" | "settings"
  >("overview");
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [securitySettings, setSecuritySettings] =
    useState<SecuritySettings | null>(null);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showEventDetails, setShowEventDetails] =
    useState<SecurityEvent | null>(null);
  const [showSessionDetails, setShowSessionDetails] =
    useState<ActiveSession | null>(null);

  const { reportError } = useErrorReporting();

  // Data fetching
  useEffect(() => {
    fetchSecurityData();
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);

      const [eventsRes, sessionsRes, settingsRes, statsRes] = await Promise.all(
        [
          fetch("/api/admin/security/events"),
          fetch("/api/admin/security/sessions"),
          fetch("/api/admin/security/settings"),
          fetch("/api/admin/security/stats"),
        ]
      );

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setSecurityEvents(eventsData.data || []);
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setActiveSessions(sessionsData.data || []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSecuritySettings(settingsData.data);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setSecurityStats(statsData.data);
      }
    } catch (error) {
      reportError(error as Error, {
        metadata: { component: "AdminSecurity", action: "fetchSecurityData" },
      });
    } finally {
      setLoading(false);
    }
  };

  // Event handlers
  const handleUpdateSettings = async (
    updatedSettings: Partial<SecuritySettings>
  ) => {
    try {
      const response = await fetch("/api/admin/security/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });

      if (!response.ok) {
        throw new Error("Failed to update security settings");
      }

      setSecuritySettings((prev) =>
        prev ? { ...prev, ...updatedSettings } : null
      );
    } catch (error) {
      reportError(error as Error, {
        metadata: { component: "AdminSecurity", action: "updateSettings" },
      });
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const response = await fetch(
        `/api/admin/security/sessions/${sessionId}/terminate`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to terminate session");
      }

      // Remove from active sessions
      setActiveSessions((prev) =>
        prev.filter((session) => session.id !== sessionId)
      );
    } catch (error) {
      reportError(error as Error, {
        metadata: { component: "AdminSecurity", action: "terminateSession" },
      });
    }
  };

  const handleRunSecurityScan = async () => {
    try {
      const response = await fetch("/api/admin/security/scan", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to initiate security scan");
      }

      // Refresh data to show updated scan time
      fetchSecurityData();
    } catch (error) {
      reportError(error as Error, {
        metadata: { component: "AdminSecurity", action: "runSecurityScan" },
      });
    }
  };

  // Filtered events
  const filteredEvents = securityEvents.filter((event) => {
    const matchesSearch =
      event.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.ipAddress.includes(searchQuery);

    const matchesSeverity =
      severityFilter === "all" || event.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  // Security score calculation
  const calculateSecurityScore = useCallback(() => {
    if (!securityStats) return 0;

    let score = 100;

    // Deduct points for failed logins
    const failureRate =
      securityStats.totalLogins > 0
        ? (securityStats.failedLogins / securityStats.totalLogins) * 100
        : 0;
    score -= failureRate * 0.5;

    // Deduct points for security incidents
    score -= securityStats.securityIncidents * 5;

    // Deduct points if no recent security scan
    if (!securityStats.lastSecurityScan) {
      score -= 20;
    } else {
      const daysSinceLastScan =
        (Date.now() - new Date(securityStats.lastSecurityScan).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceLastScan > 7) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }, [securityStats]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-100";
    if (score >= 70) return "text-yellow-600 bg-yellow-100";
    if (score >= 50) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  const getSeverityIcon = (severity: SecurityEvent["severity"]) => {
    switch (severity) {
      case "critical":
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case "high":
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />;
      case "medium":
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-blue-600" />;
    }
  };

  const getEventTypeIcon = (type: SecurityEvent["type"]) => {
    switch (type) {
      case "login":
      case "logout":
        return <UserIcon className="w-5 h-5" />;
      case "failed_login":
        return <LockClosedIcon className="w-5 h-5" />;
      case "password_change":
        return <KeyIcon className="w-5 h-5" />;
      case "role_change":
      case "permission_change":
        return <ShieldCheckIcon className="w-5 h-5" />;
      case "api_access":
        return <ComputerDesktopIcon className="w-5 h-5" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading security data...</span>
      </div>
    );
  }

  const securityScore = calculateSecurityScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Center</h1>
          <p className="text-gray-600 mt-1">
            Monitor security events, manage sessions, and configure security
            settings
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div
            className={`px-4 py-2 rounded-lg font-semibold ${getScoreColor(securityScore)}`}
          >
            Security Score: {Math.round(securityScore)}%
          </div>
          <Button onClick={handleRunSecurityScan}>
            <ShieldCheckIcon className="w-4 h-4 mr-2" />
            Run Security Scan
          </Button>
        </div>
      </div>

      {/* Security Overview Cards */}
      {securityStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Logins
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {securityStats.totalLogins}
                  </p>
                </div>
                <UserIcon className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Failed Logins
                  </p>
                  <p className="text-2xl font-bold text-red-900">
                    {securityStats.failedLogins}
                  </p>
                </div>
                <LockClosedIcon className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Active Sessions
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {securityStats.activeSessions}
                  </p>
                </div>
                <ComputerDesktopIcon className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Security Incidents
                  </p>
                  <p className="text-2xl font-bold text-orange-900">
                    {securityStats.securityIncidents}
                  </p>
                </div>
                <ExclamationTriangleIcon className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "overview", label: "Overview", icon: ShieldCheckIcon },
            {
              id: "events",
              label: "Security Events",
              icon: ExclamationTriangleIcon,
            },
            {
              id: "sessions",
              label: "Active Sessions",
              icon: ComputerDesktopIcon,
            },
            { id: "settings", label: "Settings", icon: KeyIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "events" && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Security Events</h2>
              <div className="flex items-center space-x-4">
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
                  className="w-64"
                />
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    {getSeverityIcon(event.severity)}
                    {getEventTypeIcon(event.type)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {event.description}
                      </p>
                      <p className="text-sm text-gray-600">
                        {event.user.email} •{" "}
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        event.severity === "critical"
                          ? "bg-red-100 text-red-800"
                          : event.severity === "high"
                            ? "bg-orange-100 text-orange-800"
                            : event.severity === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {event.severity.toUpperCase()}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowEventDetails(event)}
                    >
                      <EyeIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {activeTab === "sessions" && (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-6">Active Sessions</h2>

            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <ComputerDesktopIcon className="w-6 h-6 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {session.userEmail}
                        {session.isCurrentSession && (
                          <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Current Session
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {session.ipAddress} • Last activity:{" "}
                        {new Date(session.lastActivity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowSessionDetails(session)}
                    >
                      <EyeIcon className="w-4 h-4" />
                    </Button>
                    {!session.isCurrentSession && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTerminateSession(session.id)}
                      >
                        <XMarkIcon className="w-4 h-4" />
                        Terminate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {activeTab === "settings" && securitySettings && (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-6">Security Settings</h2>

            <div className="space-y-6">
              {/* Authentication Settings */}
              <div>
                <h3 className="text-md font-medium mb-4">Authentication</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Login Attempts
                    </label>
                    <Input
                      type="number"
                      value={securitySettings.maxLoginAttempts}
                      onChange={(e) =>
                        handleUpdateSettings({
                          maxLoginAttempts: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lockout Duration (minutes)
                    </label>
                    <Input
                      type="number"
                      value={securitySettings.lockoutDuration / 60000} // Convert from ms to minutes
                      onChange={(e) =>
                        handleUpdateSettings({
                          lockoutDuration: parseInt(e.target.value) * 60000,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Password Requirements */}
              <div>
                <h3 className="text-md font-medium mb-4">
                  Password Requirements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Length
                    </label>
                    <Input
                      type="number"
                      value={securitySettings.passwordMinLength}
                      onChange={(e) =>
                        handleUpdateSettings({
                          passwordMinLength: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={securitySettings.passwordRequireSpecial}
                        onChange={(e) =>
                          handleUpdateSettings({
                            passwordRequireSpecial: e.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      Require special characters
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={securitySettings.passwordRequireNumbers}
                        onChange={(e) =>
                          handleUpdateSettings({
                            passwordRequireNumbers: e.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      Require numbers
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={securitySettings.passwordRequireUppercase}
                        onChange={(e) =>
                          handleUpdateSettings({
                            passwordRequireUppercase: e.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      Require uppercase letters
                    </label>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div>
                <h3 className="text-md font-medium mb-4">
                  Security Notifications
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={securitySettings.loginNotifications}
                      onChange={(e) =>
                        handleUpdateSettings({
                          loginNotifications: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    Email notifications for new logins
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={securitySettings.suspiciousActivityAlerts}
                      onChange={(e) =>
                        handleUpdateSettings({
                          suspiciousActivityAlerts: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    Alerts for suspicious activity
                  </label>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Event Details Modal */}
      {showEventDetails && (
        <Modal onClose={() => setShowEventDetails(null)}>
          <ModalHeader>
            <ModalTitle>Security Event Details</ModalTitle>
          </ModalHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Event Type
              </label>
              <p className="text-gray-900">
                {showEventDetails.type.replace("_", " ").toUpperCase()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                User
              </label>
              <p className="text-gray-900">
                {showEventDetails.user.email} ({showEventDetails.user.role})
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Timestamp
              </label>
              <p className="text-gray-900">
                {new Date(showEventDetails.timestamp).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                IP Address
              </label>
              <p className="text-gray-900">{showEventDetails.ipAddress}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                User Agent
              </label>
              <p className="text-gray-900 text-sm">
                {showEventDetails.userAgent}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <p className="text-gray-900">{showEventDetails.description}</p>
            </div>
            {showEventDetails.details && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Additional Details
                </label>
                <pre className="text-sm bg-gray-100 p-3 rounded mt-2">
                  {JSON.stringify(showEventDetails.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Session Details Modal */}
      {showSessionDetails && (
        <Modal onClose={() => setShowSessionDetails(null)}>
          <ModalHeader>
            <ModalTitle>Session Details</ModalTitle>
          </ModalHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                User
              </label>
              <p className="text-gray-900">{showSessionDetails.userEmail}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                IP Address
              </label>
              <p className="text-gray-900">{showSessionDetails.ipAddress}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <p className="text-gray-900">
                {showSessionDetails.location || "Unknown"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Created
              </label>
              <p className="text-gray-900">
                {new Date(showSessionDetails.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Last Activity
              </label>
              <p className="text-gray-900">
                {new Date(showSessionDetails.lastActivity).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                User Agent
              </label>
              <p className="text-gray-900 text-sm">
                {showSessionDetails.userAgent}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
