// src/lib/auth/auth-error-utils.ts
import { APIError } from "better-auth/api";
import { z } from "zod";

export interface AuthErrorDetails {
  [key: string]: string[];
}

// export type BetterAuthAPIErrorType = import("better-auth/api").APIError;
export type BetterAuthAPIErrorType = APIError;

export type BetterAuthClientErrorType = {
  code?: string | undefined;
  message?: string | undefined;
  t?: boolean | undefined;
  status: number;
  statusText: string;
} | null;

export interface AuthErrorResponse {
  message: string;
  code?: string;
  status?: number | string;
  statusText?: string;
  details?: AuthErrorDetails;
}

// Type guard for BetterAuth Client errors
export function isBetterAuthClientError(
  error: unknown
): error is BetterAuthClientErrorType {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "status" in error
  );
} // Type guard for BetterAuth API errors
export function isBetterAuthAPIError(
  error: unknown
): error is BetterAuthAPIErrorType {
  return (
    typeof error === "object" &&
    error !== null &&
    // "code" in error &&
    "status" in error &&
    "body" in error &&
    "headers" in error &&
    "statusCode" in error
  );
}

export function isNetworkError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message?.includes("network") ||
      error.message?.includes("failed to fetch") ||
      error.message?.includes("internet") ||
      // This Next.js specific error appears when network is down
      error.message?.includes("ECONNREFUSED") ||
      error.message?.includes("ETIMEDOUT") ||
      error.code?.includes("ECONNREFUSED") ||
      error.code?.includes("ETIMEDOUT") ||
      error.code?.includes("ETIMEDOUT"))
  );
}

// Format auth errors based on error codes
export function formatAuthError(error: unknown): AuthErrorResponse {
  try {
    // Default error response
    const defaultError: AuthErrorResponse = {
      message: "An unexpected error occurred",
    };

    // Return early if no error
    if (!error) return defaultError;

    if (isNetworkError(error)) {
      return {
        message:
          "Network error. Please check your internet connection and try again.",
        code: "NETWORK_ERROR",
        status: 0,
      };
    }

    // Handle BetterAuth errors
    if (isBetterAuthClientError(error)) {
      const details: AuthErrorDetails = {};
      let message = "";

      switch (error?.code) {
        case "USER_NOT_FOUND":
          message = "User not found";
          break;
        case "FAILED_TO_CREATE_USER":
          message = "Failed to sign up. Check your credentials and try again.";
          break;
        case "FAILED_TO_CREATE_SESSION":
          message = "Failed to create session";
          break;
        case "FAILED_TO_UPDATE_USER":
          message = "Failed to update user";
          break;
        case "FAILED_TO_GET_SESSION":
          message =
            "You are not logged in, and you cannot perform this action. Try refreshing the page or logging in";
          break;
        case "INVALID_PASSWORD":
          message = "Invalid password";
          details.password = ["Invalid password"];
          break;
        case "INVALID_EMAIL":
          message = "Invalid email";
          details.email = ["Invalid email address"];
          break;
        case "INVALID_EMAIL_OR_PASSWORD":
          message = "Invalid password";
          details.password = [
            "Password is incorrect. Please correct your password and try again",
          ];
          break;
        case "SOCIAL_ACCOUNT_ALREADY_LINKED":
          message = "Social account already linked";
          break;
        case "PROVIDER_NOT_FOUND":
          message = "Provider not found";
          break;
        case "INVALID_TOKEN":
          message =
            "This password reset link is either expired or invalid.\nPlease request a new link from the forgot password page.";
          break;
        case "ID_TOKEN_NOT_SUPPORTED":
          message = "id_token not supported";
          break;
        case "FAILED_TO_GET_USER_INFO":
          message = "Failed to get user info";
          break;
        case "USER_EMAIL_NOT_FOUND":
          message = "User email not found";
          details.email = ["User email not found"];
          break;
        case "EMAIL_NOT_VERIFIED":
          message = "Email not verified";
          details.email = [
            "Email not verified. Please check your email to verify your account.",
          ];
          break;
        case "PASSWORD_TOO_SHORT":
          message = "Password too short";
          details.password = ["Password too short"];
          break;
        case "PASSWORD_TOO_LONG":
          message = "Password too long";
          details.password = ["Password too long"];
          break;
        case "USER_ALREADY_EXISTS":
          message = "User already exists";
          details.email = [
            "This email address is already in use by another user",
          ];
          break;
        case "EMAIL_CAN_NOT_BE_UPDATED":
          message = "Email can not be updated";
          details.email = ["Email can not be updated"];
          break;
        case "CREDENTIAL_ACCOUNT_NOT_FOUND":
          message = "Credential account not found";
          break;
        case "SESSION_EXPIRED":
          message = "Session expired. Re-authenticate to perform this action.";
          break;
        case "FAILED_TO_UNLINK_LAST_ACCOUNT":
          message = "You can\\'t unlink your last account";
          break;
        case "ACCOUNT_NOT_FOUND":
          message = "Account not found";
          break;
        // Add other BetterAuth error codes as needed
        default:
          message = error?.message || "Authentication failed";
      }

      return {
        code: error?.code,
        message,
        status: error?.status,
        statusText: error?.statusText,
        details: Object.keys(details).length > 0 ? details : undefined,
      };
    }

    // Handle BetterAuth API errors
    if (isBetterAuthAPIError(error)) {
      const details: AuthErrorDetails = {};
      let message = "";
      let code = "";

      switch (error?.body?.code) {
        case "USER_NOT_FOUND":
          message = "User not found";
          break;
        case "FAILED_TO_CREATE_USER":
          message = "Failed to sign up. Check your credentials and try again.";
          break;
        case "FAILED_TO_CREATE_SESSION":
          message = "Failed to create session";
          break;
        case "FAILED_TO_UPDATE_USER":
          message = "Failed to update user";
          break;
        case "FAILED_TO_GET_SESSION":
          message =
            "You are not logged in, and you cannot perform this action. Try refreshing the page or logging in";
          break;
        case "INVALID_PASSWORD":
          message = "Invalid password";
          details.password = ["Invalid password"];
          break;
        case "INVALID_EMAIL":
          message = "Invalid email";
          details.email = ["Invalid email address"];
          break;
        case "INVALID_EMAIL_OR_PASSWORD":
          message = "Invalid password";
          details.password = [
            "Password is incorrect. Please correct your password and try again",
          ];
          break;
        case "SOCIAL_ACCOUNT_ALREADY_LINKED":
          message = "Social account already linked";
          break;
        case "PROVIDER_NOT_FOUND":
          message = "Provider not found";
          break;
        case "INVALID_TOKEN":
          message =
            "This password reset link is either expired or invalid.\nPlease request a new link from the forgot password page.";
          break;
        case "ID_TOKEN_NOT_SUPPORTED":
          message = "id_token not supported";
          break;
        case "FAILED_TO_GET_USER_INFO":
          message = "Failed to get user info";
          break;
        case "USER_EMAIL_NOT_FOUND":
          message = "User email not found";
          details.email = ["User email not found"];
          break;
        case "EMAIL_NOT_VERIFIED":
          message = "Email not verified";
          details.email = [
            "Email not verified. Please check your email to verify your account.",
          ];
          break;
        case "PASSWORD_TOO_SHORT":
          message = "Password too short";
          details.password = ["Password too short"];
          break;
        case "PASSWORD_TOO_LONG":
          message = "Password too long";
          details.password = ["Password too long"];
          break;
        case "USER_ALREADY_EXISTS":
          message = "User already exists";
          details.email = [
            "This email address is already in use by another user",
          ];
          break;
        case "EMAIL_CAN_NOT_BE_UPDATED":
          message = "Email can not be updated";
          details.email = ["Email can not be updated"];
          break;
        case "CREDENTIAL_ACCOUNT_NOT_FOUND":
          message = "Credential account not found";
          break;
        case "SESSION_EXPIRED":
          message = "Session expired. Re-authenticate to perform this action.";
          break;
        case "FAILED_TO_UNLINK_LAST_ACCOUNT":
          message = "You can\\'t unlink your last account";
          break;
        case "ACCOUNT_NOT_FOUND":
          message = "Account not found";
          break;
        // Add other BetterAuth error codes as needed
        default:
          message = error?.message || "Authentication failed";
      }
      return {
        message,
        status: error?.status,
        details: Object.keys(details).length > 0 ? details : undefined,
      };
    }

    // Handle string error
    if (typeof error === "string") {
      return { message: error };
    }

    // Handle Error instance
    if (error instanceof Error) {
      return { message: error.message };
    }

    // Handle Zod errors
    if (error instanceof z.ZodError) {
      const details: AuthErrorDetails = {};
      error.errors.forEach((err) => {
        const field = err.path.join(".");
        if (!details[field]) details[field] = [];
        details[field].push(err.message);
      });
      return {
        message: "Validation error",
        details,
      };
    }

    return defaultError;
  } catch (formattingError) {
    console.error("formatAuthError crashed:", formattingError, error);
    return {
      message: `FORMAT_AUTH_ERROR_CRASHED  - Hmn chale, an error occured in the formatAuthError function while handling the Auth error😂. The error: \`${formattingError.name}: ${formattingError.message}\` `,
      code: "FORMAT_AUTH_ERROR_CRASHED",
    };
  }
}
