"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

import { Loader2 } from "lucide-react";

import { useSession } from "@/lib/api/auth";
// import { useSession } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/state/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireGuest?: boolean;
}

/**
 * AuthGuard - Protects routes based on authentication state
 *
 * Usage examples:
 *
 * 1. Protected route (redirect to login if not authenticated)
 *    <AuthGuard requireAuth={true}>
 *      <DashboardPage />
 *    </AuthGuard>
 *
 * 2. Guest-only route (redirect to dashboard if already logged in)
 *    <AuthGuard requireGuest={true}>
 *      <LoginPage />
 *    </AuthGuard>
 *
 * 3. Hybrid route (accessible to everyone, but components might render differently)
 *    <AuthGuard>
 *      <PublicPage />
 *    </AuthGuard>
 */
export function AuthGuard({
  children,
  requireAuth = false,
  requireGuest = false,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isInitialized } = useAuthStore();

  // Fetch session data - this ensures auth state is always up-to-date
  const { isLoading: isSessionLoading } = useSession();

  useEffect(() => {
    // Only redirect after initialization to avoid flashing
    if (!isInitialized || isLoading || isSessionLoading) return;

    const publicRoutes = ["/about"];
    const isPublicRoute = publicRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // Handle authentication requirements
    if (requireAuth && !user && !isPublicRoute) {
      router.push("/sign-in");
    } else if (requireGuest && user) {
      // If guest only and logged in, redirect to home
      router.push("/");
    }
  }, [
    user,
    isLoading,
    isInitialized,
    isSessionLoading,
    pathname,
    router,
    requireAuth,
    requireGuest,
  ]);

  // Show loading state
  if ((isLoading || isSessionLoading || !isInitialized) && requireAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="size-12 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render children for logged out users on protected routes
  if (requireAuth && !user) return null;

  // Don't render children for logged in users on guest-only routes
  if (requireGuest && user) return null;

  return <>{children}</>;
}
