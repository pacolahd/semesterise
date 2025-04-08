"use server";

import { headers } from "next/headers";
import { forbidden, redirect, unauthorized } from "next/navigation";

import { ServerSession, auth } from "@/lib/auth/auth";
import { Permission, rolePermissions } from "@/lib/types/common";

/**
 * Core server auth helper that leverages Next.js auth interrupts
 * Returns the session if authenticated, otherwise runs unauthorized()
 */
export async function requireAuth() {
  const headersList = await headers();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error - Auth API types are not fully compatible
  const session: ServerSession | null = await auth.api.getSession({
    headers: headersList,
  });

  if (!session?.user) {
    unauthorized();
  }

  return session;
}

/**
 * Checks if the current user has the is not logged in and doesn't have a session
 * If the user is logged in, redirect to home page
 */
export async function requireGuest() {
  const headersList = await headers();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error - Auth API types are not fully compatible
  const session: ServerSession | null = await auth.api.getSession({
    headers: headersList,
  });

  if (session?.user) {
    // If user is authenticated, redirect to home page
    redirect("/");
  }

  return true;
}

/**
 * Checks if the current user has the specified permission
 * Uses forbidden() if they don't have permission
 */
export async function requirePermission(permission: Permission) {
  const session = await requireAuth();

  // Get role-based permissions
  const userRole = session.user.role;

  const permissions = rolePermissions[userRole] || [];

  if (!permissions.includes(permission)) {
    forbidden();
  }

  return session;
}

/**
 * Checks if the current user has any of the specified permissions
 * Uses forbidden() if they don't have any of the permissions
 */
export async function requireAnyPermission(permissions: Permission[]) {
  const session = await requireAuth();

  const userRole = session.user.role;

  const userPermissions = rolePermissions[userRole] || [];

  if (!permissions.some((p) => userPermissions.includes(p))) {
    forbidden();
  }

  return session;
}

/**
 * Creates a protected server action that checks for permissions
 */
export async function createProtectedAction<T, R>(
  action: (data: T, session: any) => Promise<R>,
  permission?: Permission
) {
  return async (data: T): Promise<R> => {
    const session = permission
      ? await requirePermission(permission)
      : await requireAuth();

    return action(data, session);
  };
}
