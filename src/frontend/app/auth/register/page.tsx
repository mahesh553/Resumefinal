"use client";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FaGithub, FaGoogle, FaLinkedin } from "react-icons/fa";
import {
  FiArrowRight,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiUser,
} from "react-icons/fi";

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: "",
    color: "",
  });
  const { register } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "password") {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordStrength.score < 3) {
      toast.error("Please choose a stronger password");
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      setRegistrationSuccess(true);
      toast.success(
        "Registration successful! Please check your email to verify your account."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { met: formData.password.length >= 8, text: "At least 8 characters" },
    { met: /[a-z]/.test(formData.password), text: "One lowercase letter" },
    { met: /[A-Z]/.test(formData.password), text: "One uppercase letter" },
    { met: /[0-9]/.test(formData.password), text: "One number" },
    {
      met: /[^a-zA-Z0-9]/.test(formData.password),
      text: "One special character",
    },
  ];

  // Show success state after registration
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <motion.div
          initial={false}
          animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
          transition={{ duration: isMounted ? 0.6 : 0 }}
          className="w-full max-w-md"
        >
          <motion.div
            initial={false}
            animate={
              isMounted ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }
            }
            transition={{
              delay: isMounted ? 0.3 : 0,
              duration: isMounted ? 0.5 : 0,
            }}
            className="glass-effect rounded-2xl p-8 shadow-xl text-center"
          >
            <motion.div
              initial={false}
              animate={isMounted ? { scale: 1 } : { scale: 1 }}
              transition={{
                delay: isMounted ? 0.4 : 0,
                duration: isMounted ? 0.5 : 0,
                type: isMounted ? "spring" : "tween",
              }}
              className="mb-6"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                <FiCheck className="text-4xl text-green-500" />
              </div>
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Registration Successful!
            </h2>
            <p className="text-gray-600 mb-6">
              We've sent a verification email to{" "}
              <strong>{formData.email}</strong>. Please check your inbox and
              click the verification link to complete your registration.
            </p>

            <div className="space-y-4">
              <Button
                size="lg"
                className="w-full"
                onClick={() =>
                  (window.location.href = `/auth/verify-email?email=${encodeURIComponent(formData.email)}`)
                }
                rightIcon={<FiArrowRight />}
              >
                Check Verification Status
              </Button>

              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => setRegistrationSuccess(false)}
              >
                Back to Registration
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={() =>
                    (window.location.href = `/auth/verify-email?email=${encodeURIComponent(formData.email)}`)
                  }
                  className="text-primary-600 hover:text-primary-500 font-medium"
                >
                  resend verification email
                </button>
              </p>
            </div>
          </motion.div>
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
        className="w-full max-w-lg"
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
              Join QoderResume
            </h1>
            <p className="text-gray-600 mt-2">
              Create your account and start optimizing your career
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
          {/* Social Signup Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              variant="secondary"
              size="lg"
              className="w-full justify-center"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              leftIcon={<FaGoogle className="text-red-500" />}
            >
              Sign up with Google
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
                leftIcon={<FaGithub />}
              >
                GitHub
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  signIn("linkedin", { callbackUrl: "/dashboard" })
                }
                leftIcon={<FaLinkedin className="text-blue-600" />}
              >
                LinkedIn
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                Or create account with email
              </span>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={false}
                animate={
                  isMounted ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }
                }
                transition={{
                  delay: isMounted ? 0.4 : 0,
                  duration: isMounted ? 0.4 : 0,
                }}
              >
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  First Name
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="input-primary pl-10"
                    placeholder="John"
                    required
                  />
                </div>
              </motion.div>

              <motion.div
                initial={false}
                animate={
                  isMounted ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }
                }
                transition={{
                  delay: isMounted ? 0.4 : 0,
                  duration: isMounted ? 0.4 : 0,
                }}
              >
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Last Name
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="input-primary pl-10"
                    placeholder="Doe"
                    required
                  />
                </div>
              </motion.div>
            </div>

            {/* Email Field */}
            <motion.div
              initial={false}
              animate={isMounted ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
              transition={{
                delay: isMounted ? 0.5 : 0,
                duration: isMounted ? 0.4 : 0,
              }}
            >
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-primary pl-10"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </motion.div>

            {/* Password Field */}
            <motion.div
              initial={false}
              animate={isMounted ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
              transition={{
                delay: isMounted ? 0.6 : 0,
                duration: isMounted ? 0.4 : 0,
              }}
            >
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
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
              {formData.password && (
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
              {formData.password && (
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
                delay: isMounted ? 0.7 : 0,
                duration: isMounted ? 0.4 : 0,
              }}
            >
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="input-primary pl-10 pr-10"
                  placeholder="Confirm your password"
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
              {formData.confirmPassword &&
                formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    Passwords do not match
                  </p>
                )}
            </motion.div>

            {/* Terms Agreement */}
            <motion.div
              initial={false}
              animate={isMounted ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
              transition={{
                delay: isMounted ? 0.8 : 0,
                duration: isMounted ? 0.4 : 0,
              }}
              className="flex items-start"
            >
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="text-primary-600 hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-primary-600 hover:underline"
                >
                  Privacy Policy
                </Link>
              </label>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={false}
              animate={isMounted ? { y: 0, opacity: 1 } : { y: 0, opacity: 1 }}
              transition={{
                delay: isMounted ? 0.9 : 0,
                duration: isMounted ? 0.4 : 0,
              }}
            >
              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={isLoading}
                rightIcon={!isLoading && <FiArrowRight />}
                disabled={!agreedToTerms}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </motion.div>
          </form>

          {/* Login Link */}
          <motion.div
            initial={false}
            animate={isMounted ? { opacity: 1 } : { opacity: 1 }}
            transition={{
              delay: isMounted ? 1 : 0,
              duration: isMounted ? 0.4 : 0,
            }}
            className="mt-6 text-center"
          >
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-primary-600 hover:text-primary-500 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
