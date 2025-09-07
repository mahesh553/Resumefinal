"use client";

import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useState } from "react";

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormErrorProps {
  error: ValidationError | string;
  className?: string;
  showIcon?: boolean;
  onDismiss?: () => void;
}

export interface FormErrorsProps {
  errors: ValidationError[] | Record<string, string>;
  className?: string;
  maxErrors?: number;
  showFieldNames?: boolean;
  onDismiss?: (field?: string) => void;
}

export interface FormSuccessProps {
  message: string;
  className?: string;
  showIcon?: boolean;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

// Individual form error component
export function FormError({
  error,
  className = "",
  showIcon = true,
  onDismiss,
}: FormErrorProps) {
  const errorMessage = typeof error === "string" ? error : error.message;
  const errorField = typeof error === "string" ? undefined : error.field;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-start gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg ${className}`}
    >
      {showIcon && (
        <ExclamationCircleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1">
        {errorField && <span className="font-medium">{errorField}: </span>}
        <span>{errorMessage}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
          aria-label="Dismiss error"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

// Multiple form errors component
export function FormErrors({
  errors,
  className = "",
  maxErrors = 5,
  showFieldNames = true,
  onDismiss,
}: FormErrorsProps) {
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(
    new Set()
  );

  const errorList = React.useMemo(() => {
    if (Array.isArray(errors)) {
      return errors.filter((error) => !dismissedErrors.has(error.field));
    } else {
      return Object.entries(errors)
        .filter(([field]) => !dismissedErrors.has(field))
        .map(([field, message]) => ({ field, message }));
    }
  }, [errors, dismissedErrors]);

  const visibleErrors = errorList.slice(0, maxErrors);
  const hiddenCount = errorList.length - maxErrors;

  const handleDismiss = useCallback(
    (field: string) => {
      setDismissedErrors((prev) => new Set(Array.from(prev).concat(field)));
      onDismiss?.(field);
    },
    [onDismiss]
  );

  const handleDismissAll = useCallback(() => {
    setDismissedErrors(new Set(errorList.map((error) => error.field)));
    onDismiss?.();
  }, [errorList, onDismiss]);

  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence mode="popLayout">
        {visibleErrors.map((error, index) => (
          <FormError
            key={error.field}
            error={showFieldNames ? error : error.message}
            onDismiss={() => handleDismiss(error.field)}
          />
        ))}
      </AnimatePresence>

      {hiddenCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3"
        >
          <span>
            {hiddenCount} more error{hiddenCount !== 1 ? "s" : ""} not shown.
          </span>
          <button
            onClick={handleDismissAll}
            className="ml-2 text-blue-600 hover:text-blue-800 underline"
          >
            Clear all
          </button>
        </motion.div>
      )}
    </div>
  );
}

// Form success message component
export function FormSuccess({
  message,
  className = "",
  showIcon = true,
  onDismiss,
  autoHide = false,
  autoHideDelay = 5000,
}: FormSuccessProps) {
  const [isVisible, setIsVisible] = useState(true);

  React.useEffect(() => {
    if (autoHide && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-start gap-2 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg ${className}`}
    >
      {showIcon && (
        <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1">
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button
          onClick={() => {
            setIsVisible(false);
            onDismiss();
          }}
          className="text-green-400 hover:text-green-600 transition-colors flex-shrink-0"
          aria-label="Dismiss success message"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

// Field-level error component for individual form inputs
export interface FieldErrorProps {
  error?: string;
  touched?: boolean;
  className?: string;
}

export function FieldError({
  error,
  touched,
  className = "",
}: FieldErrorProps) {
  if (!error || !touched) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={`text-sm text-red-600 mt-1 ${className}`}
    >
      {error}
    </motion.div>
  );
}

// Hook for managing form errors
export function useFormErrors() {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const addError = useCallback(
    (field: string, message: string, code?: string) => {
      setErrors((prev) => {
        const newErrors = prev.filter((error) => error.field !== field);
        return [...newErrors, { field, message, code }];
      });
    },
    []
  );

  const removeError = useCallback((field: string) => {
    setErrors((prev) => prev.filter((error) => error.field !== field));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const setFieldErrors = useCallback(
    (fieldErrors: Record<string, string> | ValidationError[]) => {
      if (Array.isArray(fieldErrors)) {
        setErrors(fieldErrors);
      } else {
        setErrors(
          Object.entries(fieldErrors).map(([field, message]) => ({
            field,
            message,
          }))
        );
      }
    },
    []
  );

  const hasError = useCallback(
    (field: string) => {
      return errors.some((error) => error.field === field);
    },
    [errors]
  );

  const getError = useCallback(
    (field: string) => {
      return errors.find((error) => error.field === field)?.message || "";
    },
    [errors]
  );

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setErrors([]); // Clear errors when showing success
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccessMessage("");
  }, []);

  return {
    errors,
    successMessage,
    addError,
    removeError,
    clearErrors,
    setFieldErrors,
    hasError,
    getError,
    showSuccess,
    clearSuccess,
  };
}

// Validation utility functions
export const validationUtils = {
  email: (value: string): string | undefined => {
    if (!value) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Please enter a valid email address";
    return undefined;
  },

  password: (value: string): string | undefined => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters long";
    if (!/(?=.*[a-z])/.test(value))
      return "Password must contain at least one lowercase letter";
    if (!/(?=.*[A-Z])/.test(value))
      return "Password must contain at least one uppercase letter";
    if (!/(?=.*\d)/.test(value))
      return "Password must contain at least one number";
    return undefined;
  },

  required: (value: any, fieldName: string): string | undefined => {
    if (!value || (typeof value === "string" && !value.trim())) {
      return `${fieldName} is required`;
    }
    return undefined;
  },

  minLength: (
    value: string,
    min: number,
    fieldName: string
  ): string | undefined => {
    if (value && value.length < min) {
      return `${fieldName} must be at least ${min} characters long`;
    }
    return undefined;
  },

  maxLength: (
    value: string,
    max: number,
    fieldName: string
  ): string | undefined => {
    if (value && value.length > max) {
      return `${fieldName} must be no more than ${max} characters long`;
    }
    return undefined;
  },

  phone: (value: string): string | undefined => {
    if (!value) return undefined; // Phone is optional
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(value)) return "Please enter a valid phone number";
    return undefined;
  },

  url: (value: string): string | undefined => {
    if (!value) return undefined; // URL is optional
    try {
      new URL(value);
      return undefined;
    } catch {
      return "Please enter a valid URL";
    }
  },
};
