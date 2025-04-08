"use client";

import { useRouter } from "next/navigation";

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

  if (!isLoading && isInitialized && !user) {
    router.push("/sign-in");
    return null;
  }

  return { user, isLoading };
}
