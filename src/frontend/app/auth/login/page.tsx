"use client";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FaGithub, FaGoogle, FaLinkedin } from "react-icons/fa";
import { FiArrowRight, FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { login } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Show success message if user came from email verification
    if (searchParams.get("verified") === "true") {
      toast.success("Email verified successfully! You can now sign in.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 className="text-3xl font-bold gradient-text">Welcome Back</h1>
            <p className="text-gray-600 mt-2">
              Sign in to continue optimizing your career
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
          {/* Social Login Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              variant="secondary"
              size="lg"
              className="w-full justify-center"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              leftIcon={<FaGoogle className="text-red-500" />}
            >
              Continue with Google
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
                Or continue with email
              </span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <motion.div
              initial={false}
              animate={isMounted ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
              transition={{
                delay: isMounted ? 0.4 : 0,
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
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-primary pl-10"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </motion.div>

            {/* Password Field */}
            <motion.div
              initial={false}
              animate={isMounted ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
              transition={{
                delay: isMounted ? 0.5 : 0,
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
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-primary pl-10 pr-10"
                  placeholder="Enter your password"
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
            </motion.div>

            {/* Remember Me & Forgot Password */}
            <motion.div
              initial={false}
              animate={isMounted ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
              transition={{
                delay: isMounted ? 0.6 : 0,
                duration: isMounted ? 0.4 : 0,
              }}
              className="flex items-center justify-between"
            >
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
              >
                Forgot password?
              </Link>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={false}
              animate={isMounted ? { y: 0, opacity: 1 } : { y: 0, opacity: 1 }}
              transition={{
                delay: isMounted ? 0.7 : 0,
                duration: isMounted ? 0.4 : 0,
              }}
            >
              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={isLoading}
                rightIcon={!isLoading && <FiArrowRight />}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </motion.div>
          </form>

          {/* Sign Up Link */}
          <motion.div
            initial={false}
            animate={isMounted ? { opacity: 1 } : { opacity: 1 }}
            transition={{
              delay: isMounted ? 0.8 : 0,
              duration: isMounted ? 0.4 : 0,
            }}
            className="mt-6 text-center"
          >
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/auth/register"
                className="text-primary-600 hover:text-primary-500 font-medium transition-colors"
              >
                Sign up for free
              </Link>
            </p>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={false}
          animate={isMounted ? { opacity: 1 } : { opacity: 1 }}
          transition={{
            delay: isMounted ? 1 : 0,
            duration: isMounted ? 0.4 : 0,
          }}
          className="mt-8 text-center text-sm text-gray-500"
        >
          <p>
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-primary-600 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
