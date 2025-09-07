"use client";

import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChartBarIcon,
  CogIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/admin",
    icon: HomeIcon,
    description: "Dashboard overview and quick stats",
  },
  {
    id: "users",
    label: "User Management",
    href: "/admin/users",
    icon: UsersIcon,
    description: "Manage users, roles, and permissions",
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/admin/analytics",
    icon: ChartBarIcon,
    description: "System metrics and insights",
  },
  {
    id: "monitoring",
    label: "System Monitoring",
    href: "/admin/monitoring",
    icon: ExclamationTriangleIcon,
    description: "Health checks and performance",
  },
  {
    id: "reports",
    label: "Reports",
    href: "/admin/reports",
    icon: DocumentTextIcon,
    description: "Generate and view reports",
  },
  {
    id: "security",
    label: "Security",
    href: "/admin/security",
    icon: ShieldCheckIcon,
    description: "Security settings and logs",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/admin/settings",
    icon: CogIcon,
    description: "Platform configuration",
  },
];

interface AdminSidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <motion.div
      initial={false}
      animate={{
        width: isCollapsed ? 80 : 280,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col relative",
        className
      )}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-blue-600 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900">Admin Panel</span>
                <span className="text-xs text-gray-500">QoderResume</span>
              </div>
            </div>
          )}

          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ArrowRightIcon className="w-4 h-4 text-gray-600" />
            ) : (
              <ArrowLeftIcon className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-gray-100 group relative",
                isActive
                  ? "bg-primary-50 text-primary-700 font-medium"
                  : "text-gray-700 hover:text-gray-900"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive
                    ? "text-primary-600"
                    : "text-gray-500 group-hover:text-gray-700"
                )}
              />

              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  <div className="font-medium">{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-gray-300 mt-1">
                      {item.description}
                    </div>
                  )}
                  <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200">
        {!isCollapsed ? (
          <div className="text-xs text-gray-500">
            <div className="font-medium mb-1">Admin Dashboard</div>
            <div>Version 1.0.0</div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <CogIcon className="w-4 h-4 text-gray-500" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
