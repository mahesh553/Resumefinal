"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useErrorReporting } from "@/lib/errorReporting";
import {
  BellIcon,
  CloudIcon,
  CogIcon,
  EnvelopeIcon,
  ServerIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    maxUsersPerDay: number;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
    enableEmail: boolean;
  };
  storage: {
    provider: "local" | "aws" | "cloudinary";
    maxFileSize: number;
    allowedFileTypes: string[];
    retentionDays: number;
  };
  security: {
    passwordMinLength: number;
    requireTwoFactor: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    slackWebhook: string;
    discordWebhook: string;
  };
  ai: {
    openaiApiKey: string;
    maxTokensPerUser: number;
    enableAiSuggestions: boolean;
    aiProvider: "openai" | "anthropic" | "local";
  };
}

interface SettingsSection {
  id: keyof SystemSettings;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const settingsSections: SettingsSection[] = [
  {
    id: "general",
    title: "General Settings",
    description: "Basic site configuration and features",
    icon: CogIcon,
  },
  {
    id: "email",
    title: "Email Configuration",
    description: "SMTP settings and email preferences",
    icon: EnvelopeIcon,
  },
  {
    id: "storage",
    title: "File Storage",
    description: "File upload and storage configuration",
    icon: CloudIcon,
  },
  {
    id: "security",
    title: "Security Settings",
    description: "Authentication and security policies",
    icon: ShieldCheckIcon,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Alert and notification settings",
    icon: BellIcon,
  },
  {
    id: "ai",
    title: "AI Integration",
    description: "AI services and API configuration",
    icon: ServerIcon,
  },
];

export function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] =
    useState<keyof SystemSettings>("general");
  const { reportError } = useErrorReporting();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      reportError(error as Error, {
        metadata: { component: "AdminSettings", action: "fetchSettings" },
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      toast.success("Settings saved successfully");
    } catch (error) {
      reportError(error as Error, {
        metadata: { component: "AdminSettings", action: "saveSettings" },
      });
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (
    section: keyof SystemSettings,
    key: string,
    value: any
  ) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading settings..." />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Unable to load settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure platform settings and preferences
          </p>
        </div>
        <Button
          onClick={saveSettings}
          loading={saving}
          leftIcon={<CogIcon className="w-4 h-4" />}
        >
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <Card className="lg:col-span-1">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Settings</h3>
            <nav className="space-y-2">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{section.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </Card>

        {/* Settings Content */}
        <Card className="lg:col-span-3">
          <div className="p-6">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeSection === "general" && (
                <GeneralSettings
                  settings={settings.general}
                  onUpdate={(key, value) =>
                    updateSetting("general", key, value)
                  }
                />
              )}
              {activeSection === "email" && (
                <EmailSettings
                  settings={settings.email}
                  onUpdate={(key, value) => updateSetting("email", key, value)}
                />
              )}
              {activeSection === "storage" && (
                <StorageSettings
                  settings={settings.storage}
                  onUpdate={(key, value) =>
                    updateSetting("storage", key, value)
                  }
                />
              )}
              {activeSection === "security" && (
                <SecuritySettings
                  settings={settings.security}
                  onUpdate={(key, value) =>
                    updateSetting("security", key, value)
                  }
                />
              )}
              {activeSection === "notifications" && (
                <NotificationSettings
                  settings={settings.notifications}
                  onUpdate={(key, value) =>
                    updateSetting("notifications", key, value)
                  }
                />
              )}
              {activeSection === "ai" && (
                <AISettings
                  settings={settings.ai}
                  onUpdate={(key, value) => updateSetting("ai", key, value)}
                />
              )}
            </motion.div>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface GeneralSettingsProps {
  settings: SystemSettings["general"];
  onUpdate: (key: string, value: any) => void;
}

function GeneralSettings({ settings, onUpdate }: GeneralSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          General Settings
        </h3>
      </div>

      <div className="space-y-4">
        <Input
          label="Site Name"
          value={settings.siteName}
          onChange={(e) => onUpdate("siteName", e.target.value)}
          placeholder="QoderResume"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Site Description
          </label>
          <textarea
            value={settings.siteDescription}
            onChange={(e) => onUpdate("siteDescription", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
            placeholder="Professional resume builder and job application tracker"
          />
        </div>

        <Input
          label="Max Users Per Day"
          type="number"
          value={settings.maxUsersPerDay}
          onChange={(e) => onUpdate("maxUsersPerDay", parseInt(e.target.value))}
        />

        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => onUpdate("maintenanceMode", e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Maintenance Mode</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.registrationEnabled}
              onChange={(e) =>
                onUpdate("registrationEnabled", e.target.checked)
              }
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Enable User Registration
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

interface EmailSettingsProps {
  settings: SystemSettings["email"];
  onUpdate: (key: string, value: any) => void;
}

function EmailSettings({ settings, onUpdate }: EmailSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Email Configuration
        </h3>
      </div>

      <div className="space-y-4">
        <label className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={settings.enableEmail}
            onChange={(e) => onUpdate("enableEmail", e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            Enable Email Service
          </span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="SMTP Host"
            value={settings.smtpHost}
            onChange={(e) => onUpdate("smtpHost", e.target.value)}
            placeholder="smtp.gmail.com"
          />

          <Input
            label="SMTP Port"
            type="number"
            value={settings.smtpPort}
            onChange={(e) => onUpdate("smtpPort", parseInt(e.target.value))}
            placeholder="587"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="SMTP Username"
            value={settings.smtpUser}
            onChange={(e) => onUpdate("smtpUser", e.target.value)}
            placeholder="your-email@gmail.com"
          />

          <Input
            label="SMTP Password"
            type="password"
            value={settings.smtpPassword}
            onChange={(e) => onUpdate("smtpPassword", e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="From Email"
            type="email"
            value={settings.fromEmail}
            onChange={(e) => onUpdate("fromEmail", e.target.value)}
            placeholder="noreply@qoderresume.com"
          />

          <Input
            label="From Name"
            value={settings.fromName}
            onChange={(e) => onUpdate("fromName", e.target.value)}
            placeholder="QoderResume"
          />
        </div>
      </div>
    </div>
  );
}

interface StorageSettingsProps {
  settings: SystemSettings["storage"];
  onUpdate: (key: string, value: any) => void;
}

function StorageSettings({ settings, onUpdate }: StorageSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          File Storage Settings
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Storage Provider
          </label>
          <select
            value={settings.provider}
            onChange={(e) => onUpdate("provider", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="local">Local Storage</option>
            <option value="aws">AWS S3</option>
            <option value="cloudinary">Cloudinary</option>
          </select>
        </div>

        <Input
          label="Max File Size (MB)"
          type="number"
          value={settings.maxFileSize}
          onChange={(e) => onUpdate("maxFileSize", parseInt(e.target.value))}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allowed File Types
          </label>
          <Input
            value={settings.allowedFileTypes.join(", ")}
            onChange={(e) =>
              onUpdate(
                "allowedFileTypes",
                e.target.value.split(",").map((type) => type.trim())
              )
            }
            placeholder="pdf, doc, docx, txt"
          />
        </div>

        <div>
          <Input
            label="File Retention Days"
            type="number"
            value={settings.retentionDays}
            onChange={(e) =>
              onUpdate("retentionDays", parseInt(e.target.value))
            }
          />
          <p className="text-sm text-gray-500 mt-1">
            Number of days to keep deleted files
          </p>
        </div>
      </div>
    </div>
  );
}

interface SecuritySettingsProps {
  settings: SystemSettings["security"];
  onUpdate: (key: string, value: any) => void;
}

function SecuritySettings({ settings, onUpdate }: SecuritySettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Security Settings
        </h3>
      </div>

      <div className="space-y-4">
        <Input
          label="Minimum Password Length"
          type="number"
          value={settings.passwordMinLength}
          onChange={(e) =>
            onUpdate("passwordMinLength", parseInt(e.target.value))
          }
        />

        <Input
          label="Session Timeout (minutes)"
          type="number"
          value={settings.sessionTimeout}
          onChange={(e) => onUpdate("sessionTimeout", parseInt(e.target.value))}
        />

        <Input
          label="Max Login Attempts"
          type="number"
          value={settings.maxLoginAttempts}
          onChange={(e) =>
            onUpdate("maxLoginAttempts", parseInt(e.target.value))
          }
        />

        <Input
          label="Lockout Duration (minutes)"
          type="number"
          value={settings.lockoutDuration}
          onChange={(e) =>
            onUpdate("lockoutDuration", parseInt(e.target.value))
          }
        />

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.requireTwoFactor}
            onChange={(e) => onUpdate("requireTwoFactor", e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            Require Two-Factor Authentication
          </span>
        </label>
      </div>
    </div>
  );
}

interface NotificationSettingsProps {
  settings: SystemSettings["notifications"];
  onUpdate: (key: string, value: any) => void;
}

function NotificationSettings({
  settings,
  onUpdate,
}: NotificationSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Notification Settings
        </h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => onUpdate("emailNotifications", e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Enable Email Notifications
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.pushNotifications}
              onChange={(e) => onUpdate("pushNotifications", e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Enable Push Notifications
            </span>
          </label>
        </div>

        <Input
          label="Slack Webhook URL"
          value={settings.slackWebhook}
          onChange={(e) => onUpdate("slackWebhook", e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
        />

        <Input
          label="Discord Webhook URL"
          value={settings.discordWebhook}
          onChange={(e) => onUpdate("discordWebhook", e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
        />
      </div>
    </div>
  );
}

interface AISettingsProps {
  settings: SystemSettings["ai"];
  onUpdate: (key: string, value: any) => void;
}

function AISettings({ settings, onUpdate }: AISettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          AI Integration Settings
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI Provider
          </label>
          <select
            value={settings.aiProvider}
            onChange={(e) => onUpdate("aiProvider", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="local">Local Model</option>
          </select>
        </div>

        <Input
          label="OpenAI API Key"
          type="password"
          value={settings.openaiApiKey}
          onChange={(e) => onUpdate("openaiApiKey", e.target.value)}
          placeholder="sk-..."
        />

        <Input
          label="Max Tokens Per User (per day)"
          type="number"
          value={settings.maxTokensPerUser}
          onChange={(e) =>
            onUpdate("maxTokensPerUser", parseInt(e.target.value))
          }
        />

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.enableAiSuggestions}
            onChange={(e) => onUpdate("enableAiSuggestions", e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            Enable AI Suggestions
          </span>
        </label>
      </div>
    </div>
  );
}
