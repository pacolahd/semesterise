// src/lib/auth/authorization.ts
import { ServerSession } from "@/lib/auth/auth";
import { ClientSessionResult, authClient } from "@/lib/auth/auth-client";

import { Permission } from "../types/common";

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

// Check if a user has a specific permission based on their role
export function hasPermission(
  session: ServerSession | null,
  permission: Permission
): boolean {
  if (!session?.user?.role) return false;

  const permissions = rolePermissions[session.user.role] || [];
  return permissions.includes(permission);
}

// Verify a session has proper authorization
export async function checkAuthorization(permission: Permission): Promise<{
  authorized: boolean;
  session: ServerSession | null;
}> {
  // Get the current session
  const getSessionResult: ClientSessionResult = await authClient.getSession();
  const session = getSessionResult.data as ServerSession;
  const error = getSessionResult.error;
  if (error || !session) {
    return { authorized: false, session: null };
  }

  return {
    authorized: hasPermission(session, permission),
    session,
  };
}

// Verify either authentication or authorization or both

// For petition-specific roles, you'd need a separate system
// This would integrate with your petition participants model
