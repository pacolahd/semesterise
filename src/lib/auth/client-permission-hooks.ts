"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ServerSessionUser } from "@/lib/auth/auth";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Permission, rolePermissions } from "@/lib/types/common";

/**
 * Check if the current user has a specific permission
 */
export function useHasPermission(permission: Permission) {
  const { user } = useAuthStore();

  if (!user) return false;

  const permissions = rolePermissions[user.role] || [];
  return permissions.includes(permission);
}

/**
 * Check if the current user has any of the specified permissions
 */
export function useHasAnyPermission(permissions: Permission[]) {
  const { user } = useAuthStore();

  if (!user) return false;

  const userPermissions = rolePermissions[user.role] || [];
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * Check if the current user has all of the specified permissions
 */
export function useHasAllPermissions(permissions: Permission[]) {
  const { user } = useAuthStore();

  if (!user) return false;

  const userPermissions = rolePermissions[user.role] || [];
  return permissions.every((p) => userPermissions.includes(p));
}

/**
 * Get all permissions for the current user
 */
export function useUserPermissions() {
  const { user } = useAuthStore();

  if (!user) return [];

  return rolePermissions[user.role] || [];
}

/**
 * A hook that redirects to unauthorized page if user is not authenticated
 */
export function useRequireAuth() {
  const router = useRouter();
  const { user, isLoading, isInitialized } = useAuthStore();

  if (!isLoading && isInitialized) {
    if (!user) {
      router.push("/sign-in");
      return null;
    }
    // else if (user && !(user as ServerSessionUser)?.onboardingCompleted) {
    // }
  }
  // if (!isLoading && isInitialized && user && !user.onboardingCompleted) {
  //   router.push("/onboarding");
  //   return null;
  // }

  return { user, isLoading };
}

/**
 * A hook that redirects to home page if user is authenticated
 */
export function useRequireGuest(redirectTo = "/") {
  const { user, isLoading, isInitialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !isLoading && user) {
      // If the user is logged in, redirect away from this page
      router.replace(redirectTo);
    }
  }, [user, isLoading, isInitialized, router, redirectTo]);

  return { isLoading: isLoading || !isInitialized };
}
