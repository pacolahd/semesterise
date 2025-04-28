// src/lib/academic-plan/transaction-utils.ts
import { SEMESTER_CREDIT_LIMITS } from "./constants";

/**
 * Get the credit limit for a semester based on major and whether it's summer
 */
export function getCreditLimit(
  majorCode: string | null | undefined,
  isSummer?: boolean
): number {
  if (isSummer) {
    return SEMESTER_CREDIT_LIMITS.MAX_CREDITS_SUMMER;
  }

  // Check if it's an engineering major
  const isEngineering = ["CE", "EE", "ME"].includes(majorCode || "");
  return isEngineering
    ? SEMESTER_CREDIT_LIMITS.MAX_CREDITS_REGULAR_ENG
    : SEMESTER_CREDIT_LIMITS.MAX_CREDITS_REGULAR;
}
