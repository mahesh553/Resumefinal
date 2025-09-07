"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "white" | "gray";
  text?: string;
  className?: string;
  variant?: "spinner" | "dots" | "pulse" | "bounce";
  children?: ReactNode;
}

const sizeClasses = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const colorClasses = {
  primary: "text-primary-600",
  secondary: "text-gray-600",
  white: "text-white",
  gray: "text-gray-400",
};

const textSizeClasses = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

export function LoadingSpinner({
  size = "md",
  color = "primary",
  text,
  className = "",
  variant = "spinner",
  children,
}: LoadingSpinnerProps) {
  
  const renderSpinner = () => {
    switch (variant) {
      case "dots":
        return (
          <div className={`flex space-x-1 ${sizeClasses[size]}`}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full bg-current ${colorClasses[color]}`}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        );
        
      case "pulse":
        return (
          <motion.div
            className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full bg-current`}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
        );
        
      case "bounce":
        return (
          <div className={`flex space-x-1`}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`w-3 h-3 rounded-full bg-current ${colorClasses[color]}`}
                animate={{
                  y: [-5, 5, -5],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        );
        
      default: // spinner
        return (
          <motion.div
            className={`${sizeClasses[size]} ${colorClasses[color]}`}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </motion.div>
        );
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {renderSpinner()}
      {text && (
        <span className={`font-medium ${colorClasses[color]} ${textSizeClasses[size]}`}>
          {text}
        </span>
      )}
      {children}
    </div>
  );
}

// Loading skeleton components with enhanced variants
export function SkeletonCard({ 
  className = "", 
  variant = "default",
  animate = true 
}: { 
  className?: string; 
  variant?: "default" | "list" | "profile" | "stats";
  animate?: boolean;
}) {
  const baseClass = animate ? "animate-pulse" : "";
  
  const renderVariant = () => {
    switch (variant) {
      case "list":
        return (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        );
        
      case "profile":
        return (
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        );
        
      case "stats":
        return (
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-2 bg-gray-200 rounded w-full"></div>
          </div>
        );
        
      default:
        return (
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`${baseClass} bg-white rounded-xl p-6 ${className}`}>
      {renderVariant()}
    </div>
  );
}

export function SkeletonList({
  count = 3,
  className = "",
  variant = "default",
}: {
  count?: number;
  className?: string;
  variant?: "default" | "list" | "profile" | "stats";
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}

// Enhanced page loading component with different layouts
export function PageLoading({ 
  message = "Loading...", 
  description,
  size = "lg",
  variant = "spinner"
}: { 
  message?: string; 
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "spinner" | "dots" | "pulse" | "bounce";
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <LoadingSpinner size={size} variant={variant} className="justify-center mb-4" />
        <p className={`${size === 'sm' ? 'text-sm' : 'text-lg'} text-gray-900 font-medium mb-2`}>{message}</p>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>
    </div>
  );
}

// Inline loading component for sections
export function InlineLoading({
  message = "Loading...",
  size = "sm",
  variant = "spinner",
  className = ""
}: {
  message?: string;
  size?: "xs" | "sm" | "md";
  variant?: "spinner" | "dots" | "pulse";
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center py-4 ${className}`}>
      <LoadingSpinner size={size} variant={variant} text={message} />
    </div>
  );
}

// Progress loading component
export function ProgressLoading({
  progress,
  message = "Loading...",
  showPercentage = true,
  className = ""
}: {
  progress: number;
  message?: string;
  showPercentage?: boolean;
  className?: string;
}) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <div className={`text-center ${className}`}>
      <LoadingSpinner size="lg" className="justify-center mb-4" />
      <p className="text-lg font-medium text-gray-900 mb-2">{message}</p>
      {showPercentage && (
        <p className="text-sm text-gray-600 mb-4">{Math.round(clampedProgress)}% complete</p>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className="bg-primary-600 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

export default LoadingSpinner;
