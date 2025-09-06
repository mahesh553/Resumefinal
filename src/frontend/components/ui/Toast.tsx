"use client";

import { toast as hotToast, Toaster, ToastOptions } from "react-hot-toast";

interface CustomToastOptions extends ToastOptions {
  title?: string;
}

// Custom toast functions with consistent styling
export const toast = {
  success: (message: string, options?: CustomToastOptions) => {
    return hotToast.success(message, {
      style: {
        background: "#f0fdf4",
        color: "#166534",
        border: "1px solid #bbf7d0",
      },
      iconTheme: {
        primary: "#22c55e",
        secondary: "#fff",
      },
      ...options,
    });
  },

  error: (message: string, options?: CustomToastOptions) => {
    return hotToast.error(message, {
      style: {
        background: "#fef2f2",
        color: "#dc2626",
        border: "1px solid #fecaca",
      },
      iconTheme: {
        primary: "#ef4444",
        secondary: "#fff",
      },
      ...options,
    });
  },

  warning: (message: string, options?: CustomToastOptions) => {
    return hotToast(message, {
      icon: "⚠️",
      style: {
        background: "#fefce8",
        color: "#ca8a04",
        border: "1px solid #fde047",
      },
      ...options,
    });
  },

  info: (message: string, options?: CustomToastOptions) => {
    return hotToast(message, {
      icon: "ℹ️",
      style: {
        background: "#eff6ff",
        color: "#2563eb",
        border: "1px solid #bfdbfe",
      },
      ...options,
    });
  },

  loading: (message: string, options?: ToastOptions) => {
    return hotToast.loading(message, {
      style: {
        background: "#fff",
        color: "#374151",
        border: "1px solid #e5e7eb",
      },
      ...options,
    });
  },

  dismiss: hotToast.dismiss,
  remove: hotToast.remove,
};

// Toast Provider Component
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Default options for all toasts
        duration: 4000,
        style: {
          background: "#fff",
          color: "#374151",
          border: "1px solid #e5e7eb",
          borderRadius: "0.5rem",
          fontSize: "14px",
          fontWeight: "500",
        },
        // Default options for specific types
        success: {
          iconTheme: {
            primary: "#10b981",
            secondary: "#fff",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
        },
      }}
    />
  );
}

export default toast;
