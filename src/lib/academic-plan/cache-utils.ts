// src/lib/academic-plan/cache-utils.ts
import { eq } from "drizzle-orm";

import { db } from "@/drizzle";
import { studentProfiles } from "@/drizzle/schema";

import { CACHE_TTL } from "./constants";

// Student profile cache with timestamps
const studentProfileCache = new Map<
  string,
  {
    profile: any;
    timestamp: number;
  }
>();

/**
 * Get student profile with caching
 */
export async function getStudentProfileCached(
  authId: string,
  tx?: any,
  forceRefresh = false
): Promise<any> {
  const now = Date.now();
  const cached = studentProfileCache.get(authId);

  // Return cached profile if valid and not forcing refresh
  if (
    cached &&
    !forceRefresh &&
    now - cached.timestamp < CACHE_TTL.STUDENT_PROFILE
  ) {
    return cached.profile;
  }

  // Query the database (using transaction if provided)
  const queryExecutor = tx || db;
  const profile = await queryExecutor.query.studentProfiles.findFirst({
    where: eq(studentProfiles.authId, authId),
  });

  // Cache the profile if found
  if (profile) {
    studentProfileCache.set(authId, {
      profile,
      timestamp: now,
    });
  }

  return profile;
}

/**
 * Helper function to get student ID from auth ID with caching
 */
export async function getStudentIdFromAuthIdCached(
  authId: string,
  tx?: any
): Promise<string> {
  const profile = await getStudentProfileCached(authId, tx);

  if (!profile || !profile.studentId) {
    throw new Error(`No student record associated with user account ${authId}`);
  }

  return profile.studentId;
}

// Clear cache functions for invalidation
export function clearStudentProfileCache(authId: string): void {
  studentProfileCache.delete(authId);
}

export function clearAllCaches(): void {
  studentProfileCache.clear();
}
