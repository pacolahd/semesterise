// src/lib/errors/error-detection.ts
import {
  BetterAuthAPIErrorType,
  BetterAuthClientErrorType,
} from "./error-types";

/**
 * Checks if an error is from BetterAuth client
 */
export function isBetterAuthClientError(
  error: unknown
): error is BetterAuthClientErrorType {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number" &&
    "statusText" in error &&
    typeof error.statusText === "string"
  );
}

/**
 * Checks if an error is from BetterAuth API
 */
export function isBetterAuthAPIError(
  error: unknown
): error is BetterAuthAPIErrorType {
  return (
    error instanceof Error &&
    "status" in error &&
    "body" in error &&
    "headers" in error &&
    "statusCode" in error
  );
}

/**
 * Checks if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  // Check connection errors or timeout errors
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("failed to fetch") ||
      errorMessage.includes("internet") ||
      errorMessage.includes("econnrefused") ||
      errorMessage.includes("etimedout") ||
      errorMessage.includes("network request failed")
    ) {
      return true;
    }
  }

  // Check for error codes
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    const errorCode = error.code.toLowerCase();
    if (
      errorCode.includes("econnrefused") ||
      errorCode.includes("etimedout") ||
      errorCode.includes("econnreset") ||
      errorCode === "network_error"
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if an error is a validation error with field details
 */
export function hasValidationDetails(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "details" in error &&
    typeof error.details === "object" &&
    error.details !== null &&
    Object.keys(error.details).length > 0
  );
}

/**
 * Gets a specific error code from a BetterAuth error
 */
export function getAuthErrorCode(error: unknown): string | undefined {
  if (isBetterAuthClientError(error)) {
    return error?.code;
  }

  if (isBetterAuthAPIError(error)) {
    return error.body?.code;
  }

  return undefined;
}

/**
 * Gets a specific error message from a BetterAuth error
 */
export function getAuthErrorMessage(error: unknown): string | undefined {
  if (isBetterAuthClientError(error)) {
    return error?.message;
  }

  if (isBetterAuthAPIError(error)) {
    return error.body?.message;
  }

  return undefined;
}
