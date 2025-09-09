"use client";

import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiArrowRight,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiLock,
  FiShield,
} from "react-icons/fi";

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: "",
    color: "",
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
      return;
    }

    // Validate token
    validateToken(token);
  }, [token]);

  const validateToken = async (resetToken: string) => {
    try {
      const response = await fetch(`/api/auth/validate-reset-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: resetToken }),
      });

      if (response.ok) {
        setIsValidToken(true);
      } else {
        setIsValidToken(false);
        toast.error("Invalid or expired reset token");
      }
    } catch (error) {
      setIsValidToken(false);
      toast.error("Error validating reset token");
    }
  };

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;

    if (password.length >= 8) score += 1;
    if (password.match(/[a-z]/)) score += 1;
    if (password.match(/[A-Z]/)) score += 1;
    if (password.match(/[0-9]/)) score += 1;
    if (password.match(/[^a-zA-Z0-9]/)) score += 1;

    const strengthLevels = [
      { score: 0, label: "", color: "" },
      { score: 1, label: "Very Weak", color: "bg-red-500" },
      { score: 2, label: "Weak", color: "bg-orange-500" },
      { score: 3, label: "Fair", color: "bg-yellow-500" },
      { score: 4, label: "Good", color: "bg-blue-500" },
      { score: 5, label: "Strong", color: "bg-green-500" },
    ];

    return strengthLevels[score];
  };

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    setPasswordStrength(calculatePasswordStrength(newPassword));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordStrength.score < 3) {
      toast.error("Please choose a stronger password");
      return;
    }

    if (!token) {
      toast.error("Invalid reset token");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to reset password");
        return;
      }

      toast.success("Password reset successfully!");
      router.push("/auth/login?message=password-reset");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { met: password.length >= 8, text: "At least 8 characters" },
    { met: /[a-z]/.test(password), text: "One lowercase letter" },
    { met: /[A-Z]/.test(password), text: "One uppercase letter" },
    { met: /[0-9]/.test(password), text: "One number" },
    {
      met: /[^a-zA-Z0-9]/.test(password),
      text: "One special character",
    },
  ];

  // Loading state while validating token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="glass-effect rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating reset token...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <motion.div
          initial={false}
          animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
          className="glass-effect rounded-2xl p-8 text-center max-w-md"
        >
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <FiShield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Reset Link
          </h1>
          <p className="text-gray-600 mb-6">
            This password reset link is invalid or has expired. Please request a
            new one.
          </p>
          <Link href="/auth/forgot-password">
            <Button size="lg" className="w-full">
              Request New Reset Link
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <motion.div
        initial={false}
        animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
        transition={{ duration: isMounted ? 0.6 : 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={false}
            animate={isMounted ? { scale: 1 } : { scale: 1 }}
            transition={{
              delay: isMounted ? 0.2 : 0,
              duration: isMounted ? 0.5 : 0,
            }}
            className="mb-4"
          >
            <h1 className="text-3xl font-bold gradient-text">
              Set New Password
            </h1>
            <p className="text-gray-600 mt-2">
              Choose a strong password for your account
            </p>
          </motion.div>
        </div>

        {/* Main Card */}
        <motion.div
          initial={false}
          animate={
            isMounted ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }
          }
          transition={{
            delay: isMounted ? 0.3 : 0,
            duration: isMounted ? 0.5 : 0,
          }}
          className="glass-effect rounded-2xl p-8 shadow-xl"
        >
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Field */}
            <motion.div
              initial={false}
              animate={isMounted ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
              transition={{
                delay: isMounted ? 0.4 : 0,
                duration: isMounted ? 0.4 : 0,
              }}
            >
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="input-primary pl-10 pr-10"
                  placeholder="Create a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">
                      Password strength:
                    </span>
                    <span
                      className={`text-xs font-medium ${passwordStrength.score >= 3 ? "text-green-600" : "text-orange-600"}`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{
                        width: `${(passwordStrength.score / 5) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Password Requirements */}
              {password && (
                <div className="mt-3 space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center text-xs">
                      <FiCheck
                        className={`mr-2 ${req.met ? "text-green-500" : "text-gray-300"}`}
                        size={12}
                      />
                      <span
                        className={req.met ? "text-green-600" : "text-gray-500"}
                      >
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Confirm Password Field */}
            <motion.div
              initial={false}
              animate={isMounted ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
              transition={{
                delay: isMounted ? 0.5 : 0,
                duration: isMounted ? 0.4 : 0,
              }}
            >
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-primary pl-10 pr-10"
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  Passwords do not match
                </p>
              )}
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={false}
              animate={isMounted ? { y: 0, opacity: 1 } : { y: 0, opacity: 1 }}
              transition={{
                delay: isMounted ? 0.6 : 0,
                duration: isMounted ? 0.4 : 0,
              }}
            >
              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={isLoading}
                rightIcon={!isLoading && <FiArrowRight />}
                disabled={
                  password !== confirmPassword || passwordStrength.score < 3
                }
              >
                {isLoading ? "Updating Password..." : "Update Password"}
              </Button>
            </motion.div>
          </form>

          {/* Login Link */}
          <motion.div
            initial={false}
            animate={isMounted ? { opacity: 1 } : { opacity: 1 }}
            transition={{
              delay: isMounted ? 0.7 : 0,
              duration: isMounted ? 0.4 : 0,
            }}
            className="mt-6 text-center"
          >
            <p className="text-sm text-gray-500">
              Remember your password?{" "}
              <Link
                href="/auth/login"
                className="text-primary-600 hover:text-primary-500 font-medium transition-colors"
              >
                Sign in instead
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
