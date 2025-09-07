"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ToastProvider } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();

  // Show loading spinner while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking permissions..." />
      </div>
    );
  }

  // Redirect if not authenticated or not admin
  if (status === "unauthenticated" || !session) {
    redirect("/auth/login?redirect=/admin");
  }

  // Check if user is admin
  if (session.user?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <ErrorBoundary level="page">
      <div className="min-h-screen bg-gray-50">
        {/* Admin Header */}
        <AdminHeader user={session.user} />

        <div className="flex h-[calc(100vh-4rem)]">
          {/* Admin Sidebar */}
          <AdminSidebar />

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              <ErrorBoundary level="section">{children}</ErrorBoundary>
            </div>
          </main>
        </div>

        <ToastProvider />
      </div>
    </ErrorBoundary>
  );
}
