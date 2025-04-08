// src/lib/errors/error-messages.ts

/**
 * Centralized lookup table for error messages by code
 * This makes it easy to maintain consistent error messages
 */
export const errorMessagesByCode: Record<string, string> = {
  // Auth error codes
  USER_NOT_FOUND: "User not found",
  FAILED_TO_CREATE_USER:
    "Failed to sign up. Check your credentials and try again.",
  FAILED_TO_CREATE_SESSION: "Failed to create session",
  FAILED_TO_UPDATE_USER: "Failed to update user",
  FAILED_TO_GET_SESSION: "You are not logged in. Please sign in to continue.",
  INVALID_PASSWORD: "Invalid password",
  INVALID_EMAIL: "Invalid email",
  INVALID_EMAIL_OR_PASSWORD: "Invalid password. Please check your credentials.",
  SOCIAL_ACCOUNT_ALREADY_LINKED: "Social account already linked",
  PROVIDER_NOT_FOUND: "Provider not found",
  INVALID_TOKEN: "This password reset link is either expired or invalid.",
  ID_TOKEN_NOT_SUPPORTED: "ID token not supported",
  FAILED_TO_GET_USER_INFO: "Failed to get user info",
  USER_EMAIL_NOT_FOUND: "User email not found",
  EMAIL_NOT_VERIFIED:
    "Email not verified. Please check your inbox for verification link.",
  PASSWORD_TOO_SHORT: "Password too short",
  PASSWORD_TOO_LONG: "Password too long",
  USER_ALREADY_EXISTS: "User already exists",
  EMAIL_CAN_NOT_BE_UPDATED: "Email cannot be updated",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Credential account not found",
  SESSION_EXPIRED: "Session expired. Please sign in again.",
  FAILED_TO_UNLINK_LAST_ACCOUNT: "You can't unlink your last account",
  ACCOUNT_NOT_FOUND: "Account not found",
  NO_SESSION: "No active session",

  // Network error codes
  NETWORK_ERROR:
    "Network error. Please check your internet connection and try again.",
  ECONNREFUSED: "Could not connect to server. Please try again later.",
  ETIMEDOUT: "Connection timed out. Please try again later.",

  // Validation error codes
  VALIDATION_ERROR: "Please check the form for errors.",

  // Generic error codes
  UNKNOWN_ERROR: "An unexpected error occurred",
  SERVER_ERROR: "Server error. Please try again later.",
  ERROR_CONVERSION_FAILED:
    "An unexpected error occurred while processing your request.",
};

/**
 * Get user-friendly message for error code
 */
export function getErrorMessage(code: string | undefined): string {
  if (!code) return "An unexpected error occurred";
  return errorMessagesByCode[code] || `Error: ${code}`;
}
