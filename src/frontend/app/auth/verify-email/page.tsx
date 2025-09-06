"use client";

import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FiArrowRight,
  FiCheckCircle,
  FiMail,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi";

type VerificationState = "loading" | "success" | "error" | "expired";

export default function VerifyEmailPage() {
  const [verificationState, setVerificationState] =
    useState<VerificationState>("loading");
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();

  const verifyEmail = useCallback(
    async (token: string) => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setVerificationState("success");
          toast.success("Email verified successfully!");

          // Redirect to login after a short delay
          setTimeout(() => {
            router.push("/auth/login?verified=true");
          }, 2000);
        } else {
          if (data.message?.includes("expired")) {
            setVerificationState("expired");
          } else {
            setVerificationState("error");
          }
          toast.error(data.message || "Verification failed");
        }
      } catch (error) {
        console.error("Email verification error:", error);
        setVerificationState("error");
        toast.error("An error occurred during verification");
      }
    },
    [router]
  );

  useEffect(() => {
    const token = searchParams.get("token");
    const userEmail = searchParams.get("email");

    if (userEmail) {
      setEmail(userEmail);
    }

    if (token) {
      verifyEmail(token);
    } else {
      setVerificationState("error");
    }
  }, [searchParams, verifyEmail]);

  const resendVerificationEmail = async () => {
    if (!email) {
      toast.error("Email address not found");
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Verification email sent successfully!");
      } else {
        toast.error(data.message || "Failed to resend verification email");
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      toast.error("An error occurred while resending email");
    } finally {
      setIsResending(false);
    }
  };

  const getStateConfig = () => {
    switch (verificationState) {
      case "loading":
        return {
          icon: <FiRefreshCw className="animate-spin text-4xl text-blue-500" />,
          title: "Verifying Your Email",
          description: "Please wait while we verify your email address...",
          iconBg: "bg-blue-100",
        };
      case "success":
        return {
          icon: <FiCheckCircle className="text-4xl text-green-500" />,
          title: "Email Verified Successfully!",
          description:
            "Your email has been verified. You can now access all features of QoderResume.",
          iconBg: "bg-green-100",
        };
      case "expired":
        return {
          icon: <FiXCircle className="text-4xl text-orange-500" />,
          title: "Verification Link Expired",
          description:
            "Your verification link has expired. Please request a new one.",
          iconBg: "bg-orange-100",
        };
      case "error":
      default:
        return {
          icon: <FiXCircle className="text-4xl text-red-500" />,
          title: "Verification Failed",
          description:
            "We couldn't verify your email address. The link may be invalid or expired.",
          iconBg: "bg-red-100",
        };
    }
  };

  const stateConfig = getStateConfig();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-4"
          >
            <h1 className="text-3xl font-bold gradient-text">
              Email Verification
            </h1>
            <p className="text-gray-600 mt-2">
              Confirm your email to complete registration
            </p>
          </motion.div>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="glass-effect rounded-2xl p-8 shadow-xl"
        >
          {/* Status Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5, type: "spring" }}
            className="text-center mb-6"
          >
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${stateConfig.iconBg} mb-4`}
            >
              {stateConfig.icon}
            </div>
          </motion.div>

          {/* Status Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {stateConfig.title}
            </h2>
            <p className="text-gray-600 leading-relaxed">
              {stateConfig.description}
            </p>
            {email && (
              <p className="text-sm text-gray-500 mt-2">
                Email: <span className="font-medium">{email}</span>
              </p>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="space-y-4"
          >
            {verificationState === "success" && (
              <Button
                size="lg"
                className="w-full"
                onClick={() => router.push("/auth/login?verified=true")}
                rightIcon={<FiArrowRight />}
              >
                Continue to Login
              </Button>
            )}

            {(verificationState === "expired" ||
              verificationState === "error") && (
              <>
                {email && (
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={resendVerificationEmail}
                    loading={isResending}
                    leftIcon={!isResending && <FiMail />}
                  >
                    {isResending ? "Sending..." : "Resend Verification Email"}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={() => router.push("/auth/register")}
                >
                  Back to Registration
                </Button>
              </>
            )}

            {verificationState === "loading" && (
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  This may take a few moments...
                </p>
              </div>
            )}
          </motion.div>

          {/* Help Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-8 pt-6 border-t border-gray-200 text-center"
          >
            <p className="text-sm text-gray-500">
              Having trouble?{" "}
              <Link
                href="/contact"
                className="text-primary-600 hover:text-primary-500 font-medium"
              >
                Contact Support
              </Link>
            </p>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="mt-8 text-center"
        >
          <Link
            href="/"
            className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
          >
            ← Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
