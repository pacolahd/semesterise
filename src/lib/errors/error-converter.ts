// src/lib/errors/error-converter.ts
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";

import {
  AppError,
  AppErrorSerialized,
  AuthError,
  NetworkError,
  ValidationError,
} from "./app-error-classes";
import {
  getAuthErrorCode,
  getAuthErrorMessage,
  isBetterAuthAPIError,
  isBetterAuthClientError,
  isNetworkError,
} from "./error-detection";
import { errorMessagesByCode } from "./error-messages";

/**
 * Converts any error type to an AppError instance
 * This is the central error normalization function
 */
export function convertToAppError(error: unknown): AppError {
  try {
    // Handle null/undefined case
    if (!error) {
      return new AppError({
        message: "An unknown error occurred",
        code: "UNKNOWN_ERROR",
      });
    }

    // Already an AppError, just return it
    if (error instanceof AppError) {
      return error;
    }

    // If it's already a serialized AppError, deserialize it
    if (isSerializedAppError(error)) {
      return AppError.fromSerialized(error);
    }

    // Network connectivity errors
    if (isNetworkError(error)) {
      return new NetworkError(
        "Network error. Please check your internet connection and try again.",
        error
      );
    }

    // BetterAuth client errors
    if (isBetterAuthClientError(error)) {
      // Extract error details for potential form validation errors
      const details = extractBetterAuthClientErrorDetails(error);

      return new AuthError({
        message:
          error.message ||
          getMessageForCode(error.code) ||
          "Authentication failed",
        code: error.code,
        status: error.status,
        details,
        source: "auth-client",
        originalError: error,
      });
    }

    // BetterAuth API errors
    if (isBetterAuthAPIError(error)) {
      // Extract error details for potential form validation errors
      const details = extractBetterAuthAPIErrorDetails(error);

      return new AuthError({
        message:
          error?.body?.message ||
          getMessageForCode(error?.body?.code) ||
          "Authentication failed",
        code: error?.body?.code,
        status: error?.statusCode,
        details,
        source: "auth-api",
        originalError: error,
      });
    }

    // Zod validation errors
    if (error instanceof z.ZodError) {
      return new ValidationError("Validation error", formatZodErrors(error));
    }

    // Standard Error objects
    if (error instanceof Error) {
      return new AppError({
        message: error?.message,
        code: (error as any).code, // Try to get code if exists
        status: (error as any).status || 500, // Try to get status if exists
        originalError: error,
      });
    }

    // String errors
    if (typeof error === "string") {
      return new AppError({
        message: error,
        code: "UNKNOWN_ERROR",
      });
    }

    // Default fallback for unknown error types
    return new AppError({
      message: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
      originalError: error,
    });
  } catch (conversionError) {
    // Handle error during conversion
    console.error("Error during error conversion:", conversionError);
    return new AppError({
      message: "Error handling failed",
      code: "ERROR_CONVERSION_FAILED",
      originalError: error,
    });
  }
}

/**
 * Serializes any error to a plain object suitable for transmission
 */
export function serializeError(error: unknown): AppErrorSerialized {
  try {
    // Convert to AppError first (if not already)
    const appError = convertToAppError(error);

    // Then serialize it
    return appError.serialize();
  } catch (e) {
    // Fallback if serialization fails
    return {
      name: "AppError",
      message: "Error serialization failed",
      code: "ERROR_SERIALIZATION_FAILED",
      status: 500,
      source: "unknown",
    };
  }
}

/**
 * Type guard to check if an object is a serialized AppError
 */
export function isSerializedAppError(obj: unknown): obj is AppErrorSerialized {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "name" in obj &&
    "message" in obj &&
    "code" in obj &&
    "source" in obj
  );
}

/**
 * Gets a standard error message for a known error code
 */
function getMessageForCode(code?: string): string | undefined {
  if (!code) return undefined;
  return errorMessagesByCode[code];
}

/**
 * Extracts validation details from BetterAuth client errors
 */
function extractBetterAuthClientErrorDetails(
  error: any
): Record<string, string[]> | undefined {
  // If the error already has details, use those
  if (error.details && typeof error.details === "object") {
    return error.details;
  }

  // Create details for specific error codes
  if (error?.code) {
    switch (error.code) {
      case "INVALID_PASSWORD":
        return { password: ["Invalid password"] };
      case "INVALID_EMAIL":
        return { email: ["Invalid email address"] };
      case "INVALID_EMAIL_OR_PASSWORD":
        return {
          password: [
            "Password is incorrect. Please correct your password and try again",
          ],
        };
      case "USER_EMAIL_NOT_FOUND":
        return { email: ["User email not found"] };
      case "EMAIL_NOT_VERIFIED":
        return {
          email: [
            "Email not verified. Please check your email to verify your account.",
          ],
        };
      case "PASSWORD_TOO_SHORT":
        return { password: ["Password too short"] };
      case "PASSWORD_TOO_LONG":
        return { password: ["Password too long"] };
      case "USER_ALREADY_EXISTS":
        return {
          email: ["This email address is already in use by another user"],
        };
      case "EMAIL_CAN_NOT_BE_UPDATED":
        return { email: ["Email can not be updated"] };
      // Add more specific cases as needed
    }
  }

  return undefined;
}

/**
 * Extracts validation details from BetterAuth API errors
 */
function extractBetterAuthAPIErrorDetails(
  error: any
): Record<string, string[]> | undefined {
  // If the error already has details in body, use those
  if (error.body?.details && typeof error.body.details === "object") {
    return error.body.details;
  }

  // Create details for specific error messages
  if (error.body?.code) {
    switch (error.body.code) {
      case "INVALID_PASSWORD":
        return { password: ["Invalid password"] };
      case "INVALID_EMAIL":
        return { email: ["Invalid email address"] };
      case "INVALID_EMAIL_OR_PASSWORD":
        return {
          password: [
            "Password is incorrect. Please correct your password and try again",
          ],
        };
      case "USER_EMAIL_NOT_FOUND":
        return { email: ["User email not found"] };
      case "EMAIL_NOT_VERIFIED":
        return {
          email: [
            "Email not verified. Please check your email to verify your account.",
          ],
        };
      case "PASSWORD_TOO_SHORT":
        return { password: ["Password too short"] };
      case "PASSWORD_TOO_LONG":
        return { password: ["Password too long"] };
      case "USER_ALREADY_EXISTS":
        return {
          email: ["This email address is already in use by another user"],
        };
      case "EMAIL_CAN_NOT_BE_UPDATED":
        return { email: ["Email can not be updated"] };
      // Add more specific cases as needed
    }
  }
  return undefined;
}

/**
 * Formats Zod validation errors into a standardized format
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  return error.errors.reduce(
    (acc, curr) => {
      const key = curr.path.join(".");
      if (!acc[key]) acc[key] = [];
      acc[key].push(curr.message);
      return acc;
    },
    {} as Record<string, string[]>
  );
}
