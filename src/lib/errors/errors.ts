// src/lib/errors.ts
import { v4 as uuidv4 } from "uuid";

import { ErrorLogInput } from "@/drizzle/schema/system-settings/error-logs";
import { ErrorContext, ErrorSeverity } from "@/lib/types";
import { redactSensitiveData } from "@/lib/utils/redaction";

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

    // Adding this undefined check to resolve firefox/zen browser issue
    // eslint-disable-next-line no-unused-expressions,@typescript-eslint/no-unused-expressions
    Error.captureStackTrace !== undefined
      ? Error.captureStackTrace(this, this.constructor)
      : undefined;
  }

  toLog(): Omit<ErrorLogInput, "id" | "activityId"> {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      code: this.code,
      status: this.severity === "critical" ? "critical" : "unhandled",
      context: redactSensitiveData(this.context || {}, ["password", "token"]),
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
    context?: ErrorContext;
  }) {
    super({
      message: config.message,
      code: `AUTH_ERROR${config.code ? `: ${config.code}` : ""}`,
      severity: config.severity || "medium",
      isOperational: true,
      status: config.status || 401,
      details: config.details,
      context: config.context,
    });
  }
}

export class SignUpError extends AuthError {
  constructor(config: {
    message: string;
    details?: Record<string, string[]>;
    status?: number;
    code?: string;
    context?: ErrorContext;
  }) {
    super({
      message: config.message,
      details: config.details,
      status: config.status,
      code: `SIGNUP_ERROR${config.code ? `: ${config.code}` : ""}`,
      context: config.context,
    });
  }
}

export class SignInError extends AuthError {
  constructor(config: {
    message: string;
    details?: Record<string, string[]>;
    status?: number;
    code?: string;
    context?: ErrorContext;
  }) {
    super({
      ...config,
      code: `SIGNIN_ERROR${config.code ? `: ${config.code}` : ""}`,
      context: config.context,
    });
  }
}

export class ForgotPasswordError extends AuthError {
  constructor(config: {
    message: string;
    details?: Record<string, string[]>;
    status?: number;
    code?: string;
    context?: ErrorContext;
  }) {
    super({
      ...config,
      code: `FORGOT_PASSWORD_ERROR${config.code ? `: ${config.code}` : ""}`,
      context: config.context,
    });
  }
}
export class ResetPasswordError extends AuthError {
  constructor(config: {
    message: string;
    details?: Record<string, string[]>;
    status?: number;
    code?: string;
    context?: ErrorContext;
  }) {
    super({
      ...config,
      code: `RESET_PASSWORD_ERROR${config.code ? `: ${config.code.split(":")[1]}` : ""}`,
      context: config.context,
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
export type BetterAuthErrorType = {
  code?: string | undefined;
  message?: string | undefined;
  t?: boolean | undefined;
  status: number;
  statusText: string;
} | null;

export function toAppError(
  error: unknown,
  errorType: string = "AppError",
  config: {
    message?: string;
    code?: string;
    severity?: ErrorSeverity;
    context?: ErrorContext;
    status?: number;
    details?: Record<string, string[]>;
  } = {}
): AppError {
  // If it's already an AppError, just return it
  if (error instanceof AppError) return error;

  // If it's already an AppError, just return it
  if (error instanceof AppError) return error;

  // Extract info from the error
  const err =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "statusText" in error
      ? (error as unknown as Error)
      : error instanceof Error
        ? error
        : new Error(String(error));
  const message = config.message || err?.message;

  // Create the specified error type
  switch (errorType) {
    case "SignUpError":
      return new SignUpError({
        message,
        details: config.details,
        status: config.status || 400,
        code: config.code,
        context: config.context,
      });

    case "SignInError":
      return new SignInError({
        message,
        details: config.details,
        status: config.status || 401,
        code: config.code,
        context: config.context,
      });

    case "ForgotPasswordError":
      return new ForgotPasswordError({
        message,
        details: config.details,
        status: config.status || 400,
        code: config.code,
        context: config.context,
      });

    case "ResetPasswordError":
      return new ResetPasswordError({
        message,
        details: config.details,
        status: config.status || 400,
        code: config.code,
        context: config.context,
      });

    case "AuthError":
      return new AuthError({
        message,
        code: config.code,
        details: config.details,
        status: config.status || 401,
        severity: config.severity,
        context: config.context,
      });

    case "ValidationError":
      return new ValidationError(message, config.details || {});

    // Default case - create base AppError
    default:
      return new AppError({
        message,
        code: config.code || "INTERNAL_ERROR",
        severity: config.severity || "high",
        context: config.context || {
          stack: err.stack,
          originalError: error,
        },
        isOperational: false,
        status: config.status,
        details: config.details,
      });
  }
}

// export function toAppError(error: unknown): AppError {
//   if (error instanceof AppError) return error;
//
//   const err = error as Error;
//   // const err = error instanceof Error ? error : new Error(String(error));
//
//   return new AppError({
//     message: err.message,
//     code: "INTERNAL_ERROR",
//     severity: "high",
//     context: {
//       stack: err.stack,
//       originalError: error,
//     },
//     isOperational: false,
//   });
// }

export function handleAuthError(error: BetterAuthErrorType): AuthError {
  const details: Record<string, string[]> = {};
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
      message = "Failed to get session";
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
      details.email = ["This email address is already in use by another user"];
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
    default:
      message = "Generic";
  }

  return new AuthError({
    message,
    code: error?.code,
    details: Object.keys(details).length ? details : undefined,
    status: error?.status,
  });
}
