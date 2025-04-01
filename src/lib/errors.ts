// src/lib/errors.ts
import { v4 as uuidv4 } from "uuid";

import { ErrorLogInput } from "@/drizzle/schema/system-settings/error-logs";

type ErrorContext = Record<string, unknown>;
type ErrorSeverity = "low" | "medium" | "high" | "critical";

export class AppError extends Error {
  public readonly errorId: string;
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly context?: ErrorContext;
  public readonly isOperational: boolean;
  public readonly status?: number;
  public readonly details?: Record<string, string[]>;

  constructor(config: {
    message: string;
    code?: string;
    severity?: ErrorSeverity;
    context?: ErrorContext;
    isOperational?: boolean;
    status?: number;
    details?: Record<string, string[]>;
  }) {
    super(config.message);
    this.name = this.constructor.name;
    this.errorId = uuidv4();
    this.code = config.code || "INTERNAL_ERROR";
    this.severity = config.severity || "medium";
    this.context = config.context;
    this.isOperational = config.isOperational ?? true;
    this.status = config.status;
    this.details = config.details;
    Error.captureStackTrace(this, this.constructor);
  }

  toLog(): ErrorLogInput {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      code: this.code,
      status: this.severity === "critical" ? "critical" : "unhandled",
      context: this.context,
      errorId: this.errorId,
    };
  }
}

// Auth Error Hierarchy
export class AuthError extends AppError {
  constructor(config: {
    message: string;
    code?: string;
    details?: Record<string, string[]>;
    status?: number;
    severity?: ErrorSeverity;
  }) {
    super({
      message: config.message,
      code: config.code || "AUTH_ERROR",
      severity: config.severity || "medium",
      isOperational: true,
      status: config.status || 401,
      details: config.details,
    });
  }
}

export class SignUpError extends AuthError {
  constructor(config: {
    message: string;
    details?: Record<string, string[]>;
    status?: number;
    code?: string;
  }) {
    super({
      message: config.message,
      details: config.details,
      status: config.status,
      code: `SIGNUP_ERROR: ${config.code}`,
    });
  }
}

export class SignInError extends AuthError {
  constructor(config: {
    message: string;
    details?: Record<string, string[]>;
    status?: number;
  }) {
    super({
      ...config,
      code: "SIGNIN_ERROR",
    });
  }
}

export class EmailVerificationError extends AuthError {
  constructor(config: {
    message: string;
    details?: Record<string, string[]>;
    status?: number;
  }) {
    super({
      ...config,
      code: "EMAIL_VERIFICATION_ERROR",
    });
  }
}

// Domain Error Classes
export class ValidationError extends AppError {
  constructor(message: string, details: Record<string, string[]>) {
    super({
      message,
      code: "VALIDATION_ERROR",
      severity: "low",
      details,
      status: 400,
    });
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super({
      message,
      code: "AUTHORIZATION_ERROR",
      severity: "high",
      context,
      status: 403,
    });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super({
      message,
      code: "DATABASE_ERROR",
      severity: "high",
      context: originalError
        ? {
            originalError: {
              message: originalError.message,
              stack: originalError.stack,
            },
          }
        : undefined,
      isOperational: false,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super({
      message: `${resource} with id ${id} not found`,
      code: "NOT_FOUND",
      severity: "low",
      status: 404,
    });
  }
}

export class ServerActionError extends AppError {
  constructor(actionName: string, message: string, originalError?: Error) {
    super({
      message: `[${actionName}] ${message}`,
      code: "SERVER_ACTION_ERROR",
      severity: originalError ? "high" : "medium",
      context: originalError
        ? {
            originalError: {
              message: originalError.message,
              stack: originalError.stack,
            },
          }
        : undefined,
      isOperational: false,
    });
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const err = error instanceof Error ? error : new Error(String(error));

  return new AppError({
    message: err.message,
    code: "INTERNAL_ERROR",
    severity: "high",
    context: {
      stack: err.stack,
      originalError: error,
    },
    isOperational: false,
  });
}
