"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

import { Loader2, ShieldAlert } from "lucide-react";

import { useSession } from "@/lib/auth/auth-hooks";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  useHasAnyPermission,
  useHasPermission,
} from "@/lib/auth/authorization";
import { AppError } from "@/lib/errors/app-error-classes";
import { Permission } from "@/lib/types/common";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireGuest?: boolean;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[]; // Any of these permissions will grant access
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
}

export function AuthGuard({
  children,
  requireAuth = true,
  requireGuest = false,
  requiredPermission,
  requiredPermissions,
  fallback,
  loadingComponent,
  unauthorizedComponent,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isInitialized, error } = useAuthStore();

  // Check for specific permission if required
  const hasSpecificPermission = requiredPermission
    ? useHasPermission(requiredPermission)
    : true;

  // Check for any of the required permissions if specified
  const hasAnyRequiredPermission = requiredPermissions?.length
    ? useHasAnyPermission(requiredPermissions)
    : true;

  // Combined permission check
  const hasPermission = hasSpecificPermission && hasAnyRequiredPermission;

  // Fetch session data
  const sessionQuery = useSession();

  // List of public routes that bypass auth requirements
  const publicRoutes = ["/about", "/privacy-policy", "/terms"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  useEffect(() => {
    // Only redirect after initialization to avoid flashing
    if (!isInitialized || isLoading || sessionQuery.isPending) return;

    // Handle error state - if session fetch failed with auth error, redirect to login
    if (
      error &&
      requireAuth &&
      !isPublicRoute &&
      (error.code === "NO_SESSION" || error.code === "SESSION_EXPIRED")
    ) {
      router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Basic auth check
    if (requireAuth && !user && !isPublicRoute) {
      router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Guest-only check
    if (requireGuest && user) {
      router.push("/");
      return;
    }

    // Permission check (only if authenticated and requiring auth)
    if (
      requireAuth &&
      user &&
      (requiredPermission || requiredPermissions?.length) &&
      !hasPermission
    ) {
      // Navigate to unauthorized page if not on it already
      if (!pathname.startsWith("/unauthorized")) {
        router.push("/unauthorized");
      }
    }
  }, [
    user,
    isLoading,
    isInitialized,
    sessionQuery.isPending,
    pathname,
    router,
    requireAuth,
    requireGuest,
    error,
    isPublicRoute,
    requiredPermission,
    requiredPermissions,
    hasPermission,
  ]);

  // Custom loading component or default loading spinner
  const loadingDisplay = loadingComponent || (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="size-12 animate-spin text-primary" />
    </div>
  );

  // Custom unauthorized component
  const unauthorizedDisplay = unauthorizedComponent || (
    <div className="flex h-screen w-full flex-col items-center justify-center p-4">
      <ShieldAlert className="mb-4 h-16 w-16 text-red-500" />
      <h2 className="text-2xl font-bold text-red-700">Access Denied</h2>
      <p className="my-4 max-w-md text-center text-gray-600">
        You don't have permission to access this page. If you believe this is an
        error, please contact your administrator.
      </p>
      <button
        onClick={() => router.push("/")}
        className="mt-4 rounded bg-primary px-6 py-2 text-white hover:bg-primary-600"
      >
        Return to Home
      </button>
    </div>
  );

  // Show loading state
  if ((isLoading || sessionQuery.isPending || !isInitialized) && requireAuth) {
    return loadingDisplay;
  }

  // Don't render children for logged out users on protected routes
  if (requireAuth && !user && !isPublicRoute) {
    return fallback || null;
  }

  // Don't render children for logged in users on guest-only routes
  if (requireGuest && user) {
    return fallback || null;
  }

  // Handle permission denied
  if (
    requireAuth &&
    user &&
    (requiredPermission || requiredPermissions?.length) &&
    !hasPermission
  ) {
    return unauthorizedDisplay;
  }

  // If there's an error with the session but we're not enforcing auth, still render children
  if (error && !requireAuth) {
    return <>{children}</>;
  }

  // Session error on auth-required page - show error or redirect
  if (error && requireAuth && !isPublicRoute) {
    // If it's a session expired error, redirect to login
    if (error.code === "NO_SESSION" || error.code === "SESSION_EXPIRED") {
      router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
      return loadingDisplay;
    }

    // For other errors, show the error state if fallback is provided
    if (fallback) {
      return fallback;
    }

    // Default error display
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-4">
        <h2 className="mb-4 text-xl font-semibold text-red-600">
          Authentication Error
        </h2>
        <p className="mb-6 text-center text-gray-700">
          {error instanceof AppError
            ? error.message
            : "Failed to verify your login status"}
        </p>
        <button
          onClick={() => router.push("/sign-in")}
          className="rounded bg-primary px-6 py-2 text-white hover:bg-primary/90"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  // Everything is good, render children
  return <>{children}</>;
}
