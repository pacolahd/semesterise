// src/lib/utils/token-utils.ts
import crypto from "crypto";

/**
 * Generate a random verification token
 */
export function generateVerificationToken(length = 32): string {
  return crypto.randomBytes(length).toString("hex");
}
