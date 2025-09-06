"use client";

import { Button } from "@/components/ui/Button";
import {
  AdjustmentsHorizontalIcon,
  CalendarIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export interface JobFilters {
  search: string;
  status: string;
  location: string;
  appliedAfter: string;
  appliedBefore: string;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

interface AdvancedJobFiltersProps {
  filters: JobFilters;
  onFiltersChange: (filters: Partial<JobFilters>) => void;
  onReset: () => void;
  statusCounts: Record<string, number>;
  totalJobs: number;
}

const SORT_OPTIONS = [
  { value: "appliedDate", label: "Application Date" },
  { value: "vendorName", label: "Company Name" },
  { value: "jobTitle", label: "Job Title" },
  { value: "status", label: "Status" },
  { value: "createdAt", label: "Created Date" },
  { value: "updatedAt", label: "Last Updated" },
];

const DATE_PRESETS = [
  {
    label: "Today",
    getValue: () => {
      const today = new Date().toISOString().split("T")[0];
      return { appliedAfter: today, appliedBefore: today };
    },
  },
  {
    label: "This Week",
    getValue: () => {
      const today = new Date();
      const startOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay())
      );
      const endOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay() + 6)
      );
      return {
        appliedAfter: startOfWeek.toISOString().split("T")[0],
        appliedBefore: endOfWeek.toISOString().split("T")[0],
      };
    },
  },
  {
    label: "This Month",
    getValue: () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        appliedAfter: startOfMonth.toISOString().split("T")[0],
        appliedBefore: endOfMonth.toISOString().split("T")[0],
      };
    },
  },
  {
    label: "Last 30 Days",
    getValue: () => {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));
      return {
        appliedAfter: thirtyDaysAgo.toISOString().split("T")[0],
        appliedBefore: new Date().toISOString().split("T")[0],
      };
    },
  },
];

export function AdvancedJobFilters({
  filters,
  onFiltersChange,
  onReset,
  statusCounts: _statusCounts,
  totalJobs,
}: AdvancedJobFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFiltersCount = Object.values(filters).filter((value, index) => {
    const keys = Object.keys(filters);
    const key = keys[index];
    return value && key !== "search" && key !== "sortBy" && key !== "sortOrder";
  }).length;

  const handleDatePreset = (preset: (typeof DATE_PRESETS)[0]) => {
    const dates = preset.getValue();
    onFiltersChange(dates);
  };

  const clearDateFilters = () => {
    onFiltersChange({ appliedAfter: "", appliedBefore: "" });
  };

  const hasDateFilters = filters.appliedAfter || filters.appliedBefore;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
      {/* Main Search and Quick Actions */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        {/* Enhanced Search */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by job title, company, or location..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <select
            value={filters.sortBy}
            onChange={(e) => onFiltersChange({ sortBy: e.target.value })}
            className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Sort by {option.label}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onFiltersChange({
                sortOrder: filters.sortOrder === "ASC" ? "DESC" : "ASC",
              })
            }
          >
            {filters.sortOrder === "ASC" ? "↑" : "↓"}
          </Button>
        </div>

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={showAdvanced ? "bg-primary-50 border-primary-200" : ""}
        >
          <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
          Advanced
          {activeFiltersCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
              {activeFiltersCount}
            </span>
          )}
          <ChevronDownIcon
            className={`w-4 h-4 ml-2 transform transition-transform ${
              showAdvanced ? "rotate-180" : ""
            }`}
          />
        </Button>
      </div>

      {/* Advanced Filter Panel */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-200 pt-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Location Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPinIcon className="inline w-4 h-4 mr-1" />
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by location..."
                    value={filters.location}
                    onChange={(e) =>
                      onFiltersChange({ location: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarIcon className="inline w-4 h-4 mr-1" />
                    Applied After
                  </label>
                  <input
                    type="date"
                    value={filters.appliedAfter}
                    onChange={(e) =>
                      onFiltersChange({ appliedAfter: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarIcon className="inline w-4 h-4 mr-1" />
                    Applied Before
                  </label>
                  <input
                    type="date"
                    value={filters.appliedBefore}
                    onChange={(e) =>
                      onFiltersChange({ appliedBefore: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Date Presets */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Date Filters
                </label>
                <div className="flex flex-wrap gap-2">
                  {DATE_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      onClick={() => handleDatePreset(preset)}
                      className="text-xs"
                    >
                      {preset.label}
                    </Button>
                  ))}
                  {hasDateFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearDateFilters}
                      className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XMarkIcon className="w-3 h-3 mr-1" />
                      Clear Dates
                    </Button>
                  )}
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {totalJobs === 1 ? "1 job found" : `${totalJobs} jobs found`}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={onReset}>
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvanced(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
