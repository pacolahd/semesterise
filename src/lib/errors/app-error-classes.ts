// src/lib/errors/app-error-classes.ts
import {
  AppErrorData,
  ErrorSource,
  ValidationErrorDetails,
} from "./error-types";

/**
 * Base error class for all application errors
 * Standardizes error handling across the application
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number | string;
  public readonly details?: ValidationErrorDetails;
  public readonly source: ErrorSource;
  public readonly originalError?: unknown;

  constructor(options: AppErrorData) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code || "UNKNOWN_ERROR";
    this.status = options.status || 500;
    this.details = options.details;
    this.source = options.source || "unknown";
    this.originalError = options.originalError;

    // Ensures proper instanceof checks work in ES6+
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Creates a normalized object representation of the error for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      source: this.source,
      // We do not include originalError as it might not be serializable
    };
  }

  /**
   * Serializes the error to a plain object for transmission
   */
  serialize(): AppErrorSerialized {
    return {
      name: this.constructor.name,
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      source: this.source,
    };
  }

  /**
   * Creates a user-friendly message for display
   */
  toUserMessage(): string {
    return this.message;
  }

  /**
   * Whether this error has validation details
   */
  hasValidationDetails(): boolean {
    return !!this.details && Object.keys(this.details).length > 0;
  }

  /**
   * Creates an AppError instance from a serialized error
   */
  static fromSerialized(serialized: AppErrorSerialized): AppError {
    return new AppError({
      message: serialized.message,
      code: serialized.code,
      status: serialized.status,
      details: serialized.details,
      source: serialized.source,
    });
  }
}

/**
 * Serialized version of AppError suitable for JSON transmission
 */
export interface AppErrorSerialized {
  name: string;
  message: string;
  code: string;
  status: number | string;
  details?: ValidationErrorDetails;
  source: ErrorSource;
}

/**
 * Specialized error for authentication errors
 */
export class AuthError extends AppError {
  constructor(
    options: Omit<AppErrorData, "source"> & {
      source?: "auth-client" | "auth-api";
    }
  ) {
    super({
      ...options,
      code: options.code || "AUTH_ERROR",
      source: options.source || "auth-client",
    });
  }
}

/**
 * Specialized error for validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string, details: ValidationErrorDetails) {
    super({
      message,
      code: "VALIDATION_ERROR",
      status: 400,
      details,
      source: "validation",
    });
  }
}

/**
 * Specialized error for network connectivity issues
 */
export class NetworkError extends AppError {
  constructor(message?: string, originalError?: unknown) {
    super({
      message:
        message ||
        "Network error. Please check your internet connection and try again.",
      code: "NETWORK_ERROR",
      status: 0,
      source: "network",
      originalError,
    });
  }
}

/**
 * Specialized error for server errors
 */
export class ServerError extends AppError {
  constructor(options: Omit<AppErrorData, "source">) {
    super({
      ...options,
      source: "server",
    });
  }
}
