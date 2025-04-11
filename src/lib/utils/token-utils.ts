// src/lib/utils/token-utils.ts
import { randomBytes } from "crypto";

/**
 * Generate a random verification token
 */
export function generateVerificationToken(length = 32): string {
  return randomBytes(length).toString("hex");
}
