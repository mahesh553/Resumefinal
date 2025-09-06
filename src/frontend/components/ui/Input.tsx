"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: "default" | "floating" | "underline";
  size?: "sm" | "md" | "lg";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      variant = "default",
      size = "md",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || Math.random().toString(36).substr(2, 9);

    const baseClasses = [
      "w-full border transition-all duration-300 bg-white text-gray-900 placeholder-gray-400",
      "focus:outline-none focus:ring-2 focus:ring-offset-0",
      error
        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
        : "border-gray-200 focus:border-primary-500 focus:ring-primary-500",
    ];

    const variants = {
      default: "rounded-xl",
      floating: "rounded-xl",
      underline: "border-0 border-b-2 rounded-none bg-transparent px-0",
    };

    const sizes = {
      sm: leftIcon || rightIcon ? "py-2 text-sm" : "px-3 py-2 text-sm",
      md: leftIcon || rightIcon ? "py-3 text-sm" : "px-4 py-3 text-sm",
      lg: leftIcon || rightIcon ? "py-4 text-base" : "px-5 py-4 text-base",
    };

    const iconSizes = {
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
    };

    return (
      <div className="relative">
        {/* Label */}
        {label && variant !== "floating" && (
          <motion.label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div
              className={cn(
                "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400",
                iconSizes[size]
              )}
            >
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <motion.input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              baseClasses,
              variants[variant],
              sizes[size],
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            {...(props as any)}
          />

          {/* Floating Label */}
          {label && variant === "floating" && (
            <motion.label
              htmlFor={inputId}
              className={cn(
                "absolute left-3 transition-all duration-200 pointer-events-none",
                "text-gray-400",
                props.value || props.placeholder
                  ? "top-2 text-xs"
                  : "top-1/2 transform -translate-y-1/2 text-sm"
              )}
            >
              {label}
            </motion.label>
          )}

          {/* Right Icon */}
          {rightIcon && (
            <div
              className={cn(
                "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400",
                iconSizes[size]
              )}
            >
              {rightIcon}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-sm text-red-600"
          >
            {error}
          </motion.p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1 text-sm text-gray-500"
          >
            {helperText}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: "default" | "floating";
  resize?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      variant: _variant = "default",
      resize = true,
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || Math.random().toString(36).substr(2, 9);

    const baseClasses = [
      "w-full px-4 py-3 border rounded-xl transition-all duration-300",
      "bg-white text-gray-900 placeholder-gray-400",
      "focus:outline-none focus:ring-2 focus:ring-offset-0",
      error
        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
        : "border-gray-200 focus:border-primary-500 focus:ring-primary-500",
      resize ? "resize-y" : "resize-none",
    ];

    return (
      <div className="relative">
        {/* Label */}
        {label && (
          <motion.label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.label>
        )}

        {/* Textarea */}
        <motion.textarea
          ref={ref}
          id={textareaId}
          className={cn(baseClasses, className)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          {...(props as any)}
        />

        {/* Error Message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-sm text-red-600"
          >
            {error}
          </motion.p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1 text-sm text-gray-500"
          >
            {helperText}
          </motion.p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
