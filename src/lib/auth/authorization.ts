// src/lib/auth/authorization.ts
// import { headers } from "next/headers";
import { ServerSession, auth } from "@/lib/auth/auth";
import { authClient } from "@/lib/auth/auth-client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { AppError, AuthError } from "@/lib/errors/app-error-classes";
import { Permission } from "@/lib/types/common";

// Define permissions for each role
const rolePermissions: Record<string, Permission[]> = {
  student: [
    "manage:degree-audit",
    "manage:course-plans",
    "view:petitions", // Students can only view their own
  ],
  academic_advisor: [
    "view:student-records",
    "view:petitions",
    "approve:petitions",
    "reject:petitions",
    "view:reports",
  ],
  hod: [
    "view:student-records",
    "view:petitions",
    "approve:petitions",
    "reject:petitions",
    "view:reports",
  ],
  provost: [
    "view:student-records",
    "view:petitions",
    "approve:petitions",
    "reject:petitions",
    "view:reports",
  ],
  registry: [
    "view:student-records",
    "view:petitions",
    "implement:petitions",
    "view:reports",
    "manage:users",
  ],
  admin: [
    "manage:petitions",
    "view:petitions",
    "manage:degree-audit",
    "manage:course-plans",
    "view:reports",
    "manage:users",
    "view:student-records",
    "approve:petitions",
    "reject:petitions",
    "implement:petitions",
  ],
};

// ==========================================
// SHARED LOGIC - Used by both client and server
// ==========================================

/**
 * Core permission check - used by both client and server code
 */
export function hasPermission(
  userRole: string | undefined | null,
  permission: Permission
): boolean {
  if (!userRole) return false;
  const permissions = rolePermissions[userRole] || [];
  return permissions.includes(permission);
}

/**
 * Get all permissions for a given role
 */
export function getPermissionsForRole(role: string): Permission[] {
  return rolePermissions[role] || [];
}

// ==========================================
// CLIENT-SIDE HOOKS - For use in React components
// ==========================================

/**
 * Client-side hook to check if the current user has a specific permission
 * Uses the auth store for efficient access to the current user
 */
export function useHasPermission(permission: Permission): boolean {
  const { user } = useAuthStore();
  return hasPermission(user?.role, permission);
}

/**
 * Client-side hook to check if the current user has any of the given permissions
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { user } = useAuthStore();

  if (!user?.role) return false;

  const userPermissions = rolePermissions[user.role] || [];
  return permissions.some((permission) => userPermissions.includes(permission));
}

/**
 * Client-side hook to check if the current user has all of the given permissions
 */
export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { user } = useAuthStore();

  if (!user?.role) return false;

  const userPermissions = rolePermissions[user.role] || [];
  return permissions.every((permission) =>
    userPermissions.includes(permission)
  );
}

/**
 * Client-side hook to get all permissions of the current user
 */
export function useUserPermissions(): Permission[] {
  const { user } = useAuthStore();

  if (!user?.role) return [];

  return rolePermissions[user.role] || [];
}

// ==========================================
// SERVER-SIDE FUNCTIONS - For use in server components and actions
// ==========================================

/**
 * Server-side function to authorize an action based on permission
 *
 * IMPORTANT: This uses direct session fetching since server components/actions
 * don't have access to the client-side Zustand store
 */
export async function authorizeServerAction(
  permission: Permission
): Promise<ServerSession> {
  try {
    // Use auth API to get session securely on server
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error - Auth API types are not fully compatible
    const session: ServerSession | null = await authClient.getSession();

    // Handle no session case
    if (!session || !session.user) {
      throw new AuthError({
        message: "Authentication required",
        code: "UNAUTHENTICATED",
        status: 401,
      });
    }

    // Check permission
    if (!hasPermission(session.user.role, permission)) {
      throw new AuthError({
        message: `You don't have permission to perform this action`,
        code: "UNAUTHORIZED",
        status: 403,
      });
    }

    // Success case - return the session for use in the action
    return session;
  } catch (error) {
    // Convert to standardized AppError and rethrow
    if (error instanceof AppError) {
      throw error;
    }

    throw new AuthError({
      message: "Failed to verify authorization",
      code: "AUTH_CHECK_FAILED",
      status: 500,
      originalError: error,
    });
  }
}

/**
 * Server-side function to check if a user has any of the given permissions
 * Returns the session if authorized, otherwise throws
 */
export async function authorizeAnyPermission(
  permissions: Permission[]
): Promise<ServerSession> {
  try {
    // Use auth API to get session securely on server
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error - Auth API types are not fully compatible
    const session: ServerSession | null = await authClient.getSession();

    // Handle no session case
    if (!session || !session.user) {
      throw new AuthError({
        message: "Authentication required",
        code: "UNAUTHENTICATED",
        status: 401,
      });
    }

    // Check if user has any of the permissions
    if (!session.user.role) {
      throw new AuthError({
        message: "User role not defined",
        code: "MISSING_ROLE",
        status: 403,
      });
    }

    const userPermissions = rolePermissions[session.user.role] || [];
    const hasAnyRequired = permissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAnyRequired) {
      throw new AuthError({
        message: `You don't have permission to perform this action`,
        code: "UNAUTHORIZED",
        status: 403,
      });
    }

    // Success case - return the session for use in the action
    return session;
  } catch (error) {
    // Convert to standardized AppError and rethrow
    if (error instanceof AppError) {
      throw error;
    }

    throw new AuthError({
      message: "Failed to verify authorization",
      code: "AUTH_CHECK_FAILED",
      status: 500,
      originalError: error,
    });
  }
}

/**
 * Create a server action wrapper that checks permissions
 */
export function createProtectedServerAction<TInput, TOutput>(
  actionFn: (input: TInput, session: ServerSession) => Promise<TOutput>,
  permission: Permission
) {
  return async (input: TInput): Promise<TOutput> => {
    // Authorize the action
    const session = await authorizeServerAction(permission);

    // If authorized, run the action
    return actionFn(input, session);
  };
}

/**
 * Utility function to create custom role-based guards
 */
export function createPermissionGuard(requiredPermission: Permission) {
  return {
    checkServer: async (): Promise<ServerSession> => {
      return authorizeServerAction(requiredPermission);
    },
    useHasPermission: () => useHasPermission(requiredPermission),
  };
}
