"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Handle authentication errors and redirects
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?redirect=/dashboard");
      return;
    }

    // Check for token refresh errors and force logout
    if (session?.error === "RefreshAccessTokenError") {
      console.log("Token refresh failed, logging out...");
      signOut({ callbackUrl: "/auth/login?redirect=/dashboard" });
      return;
    }
  }, [status, session, router]);

  // Show loading spinner while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  // Show loading spinner while redirecting
  if (status === "unauthenticated" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Redirecting to login..." />
      </div>
    );
  }

  // Don't render dashboard if there's a session error
  if (session?.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Refreshing session..." />
      </div>
    );
  }

  return (
    <>
      <DashboardLayout />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            style: {
              background: "#10B981",
            },
          },
          error: {
            style: {
              background: "#EF4444",
            },
          },
        }}
      />
    </>
  );
}
