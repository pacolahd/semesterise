// src/lib/errors/error-types.ts
import { APIError } from "better-auth";

/**
 * Error type from BetterAuth client operations
 */
export type BetterAuthClientErrorType = {
  code?: string | undefined;
  message?: string | undefined;
  status: number;
  statusText: string;
} | null;

/**
 * Error type from BetterAuth API operations
 * Using the actual APIError type from better-auth
 */
export type BetterAuthAPIErrorType = APIError;

/**
 * A standardized interface for all application errors
 */
export interface AppErrorData {
  message: string;
  code?: string;
  status?: number | string;
  details?: ValidationErrorDetails;
  source?: ErrorSource;
  originalError?: unknown;
}

/**
 * Possible sources of errors in the application
 */
export type ErrorSource =
  | "auth-client" // From BetterAuth client
  | "auth-api" // From BetterAuth server API
  | "validation" // Form/data validation
  | "network" // Network connectivity
  | "server" // General server errors
  | "database" // Database errors
  | "unknown"; // Unclassified errors

/**
 * Fields that can have validation errors
 */
export type ValidationErrorDetails = Record<string, string[]>;

/**
 * Serialized AppError for transmission
 */
export interface SerializedAppError {
  name: string;
  message: string;
  code: string;
  status: number | string;
  details?: ValidationErrorDetails;
  source: ErrorSource;
}
