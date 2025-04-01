// src/lib/server-actions.ts
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";

import { type ZodSchema, z } from "zod";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/authorization";
import {
  AppError,
  AuthorizationError,
  ServerActionError,
  ValidationError,
} from "@/lib/errors";
import { ActivityService } from "@/lib/services/activity.service";
import type { Permission } from "@/lib/types";
import { redactSensitiveData } from "@/lib/utils/redaction";

// ======================
// 1. Type Definitions
// ======================

type BaseActionMetadata = {
  name: string;
  description?: string;
  entityType?: string;
  revalidatePaths?: string[];
  revalidateTags?: string[];
  formFields?: string[];
};

type AuthConfig =
  | { requireAuth: true; requiredPermission?: never }
  | { requiredPermission: Permission; requireAuth?: never }
  | { requireAuth?: false; requiredPermission?: never };

type ActionMetadata = BaseActionMetadata & AuthConfig;

type ActionContext = {
  userId: string;
  userRole?: string;
  userType?: string;
  ipAddress: string;
  userAgent: string;
  session?: Awaited<ReturnType<typeof auth.api.getSession>>;
};

type ActionResponse<T = void> =
  | { success: true; data: T; status?: number }
  | {
      success: false;
      error: {
        message: string;
        code?: string;
        status?: number;
        details?: Record<string, string[]>;
      };
    };

// ======================
// 2. Core Utilities
// ======================

async function getRequestContext() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  return {
    session,
    requestInfo: {
      ipAddress:
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      userAgent: headersList.get("user-agent") || "unknown",
    },
  };
}

function batchRevalidate(config: { paths?: string[]; tags?: string[] }) {
  const uniquePaths = [...new Set(config.paths || [])];
  const uniqueTags = [...new Set(config.tags || [])];

  uniquePaths.forEach((path) => revalidatePath(path));
  uniqueTags.forEach((tag) => revalidateTag(tag));
}

function formatZodErrors(error: z.ZodError) {
  return error.errors.reduce<Record<string, string[]>>((acc, err) => {
    const path = err.path.join(".");
    acc[path] = (acc[path] || []).concat(err.message);
    return acc;
  }, {});
}

async function handleActionError(
  error: unknown,
  metadata: ActionMetadata,
  context: ActionContext
): Promise<ActionResponse<never>> {
  // Known error types
  if (error instanceof AppError) {
    return ActivityService.toResponse(error);
  }

  // Zod validation errors
  if (error instanceof z.ZodError) {
    return ActivityService.toResponse(
      new ValidationError("Validation failed", formatZodErrors(error))
    );
  }

  // Convert unknown errors
  const actionError = new ServerActionError(
    metadata.name,
    error instanceof Error ? error.message : "Action failed",
    error instanceof Error ? error : undefined
  );

  // Log error
  await ActivityService.record({
    type: `${metadata.name}:error`,
    actorId: context.userId,
    actorType: context.userType,
    actorRole: context.userRole,
    status: "failed",
    errorCode: actionError.code,
    errorMessage: actionError.message,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata: {
      error: actionError.message,
    },
    ...(metadata.entityType ? { entityType: metadata.entityType } : {}),
  });

  return ActivityService.toResponse(actionError);
}

// ======================
// 3. Action Creators
// ======================

export function createStatelessAction<Output>(config: {
  metadata: ActionMetadata;
  execute: (params: { context: ActionContext }) => Promise<Output>;
}) {
  return async (): Promise<ActionResponse<Output>> => {
    const { session, requestInfo } = await getRequestContext();
    const context: ActionContext = {
      userId: session?.user?.id || "anonymous",
      userRole: session?.user?.role,
      userType: session?.user?.userType,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      session,
    };

    try {
      // Authentication & Authorization
      if (
        (config.metadata.requireAuth || config.metadata.requiredPermission) &&
        !session
      ) {
        throw new AuthorizationError("Authentication required");
      }
      if (
        config.metadata.requiredPermission &&
        !hasPermission(session, config.metadata.requiredPermission)
      ) {
        throw new AuthorizationError("Permission denied");
      }

      // Execute action
      const result = await config.execute({ context });

      // Log success
      await ActivityService.record({
        type: `${config.metadata.name}:execute`,
        actorId: context.userId,
        actorType: context.userType,
        actorRole: context.userRole,
        status: "succeeded",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        description: config.metadata.description,
        ...(config.metadata.entityType
          ? { entityType: config.metadata.entityType }
          : {}),
        metadata: {
          result: "success",
        },
      });

      batchRevalidate({
        paths: config.metadata.revalidatePaths,
        tags: config.metadata.revalidateTags,
      });

      return { success: true, data: result };
    } catch (error) {
      return handleActionError(error, config.metadata, context);
    }
  };
}

export function createAction<Input, Output>(config: {
  metadata: ActionMetadata;
  execute: (params: {
    input: Input;
    context: ActionContext;
  }) => Promise<Output>;
}) {
  return async (input: Input): Promise<ActionResponse<Output>> => {
    const { session, requestInfo } = await getRequestContext();
    const context: ActionContext = {
      userId: session?.user?.id || "anonymous",
      userRole: session?.user?.role,
      userType: session?.user?.userType,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      session,
    };

    try {
      // Authentication & Authorization
      if (
        (config.metadata.requireAuth || config.metadata.requiredPermission) &&
        !session
      ) {
        throw new AuthorizationError("Authentication required");
      }
      if (
        config.metadata.requiredPermission &&
        !hasPermission(session, config.metadata.requiredPermission)
      ) {
        throw new AuthorizationError("Permission denied");
      }

      const result = await config.execute({ input, context });

      // Log success
      await ActivityService.record({
        type: `${config.metadata.name}:execute`,
        actorId: context.userId,
        actorType: context.userType,
        actorRole: context.userRole,
        status: "succeeded",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        description: config.metadata.description,
        ...(config.metadata.entityType
          ? { entityType: config.metadata.entityType }
          : {}),
        metadata: {
          result: "success",
          input: redactSensitiveData(
            input as Record<string, unknown>,
            config.metadata.formFields
          ),
        },
      });

      batchRevalidate({
        paths: config.metadata.revalidatePaths,
        tags: config.metadata.revalidateTags,
      });

      return { success: true, data: result };
    } catch (error) {
      return handleActionError(error, config.metadata, context);
    }
  };
}

export function createValidatedAction<
  Schema extends ZodSchema,
  Output,
>(config: {
  metadata: ActionMetadata;
  schema: Schema;
  execute: (params: {
    input: z.infer<Schema>;
    context: ActionContext;
  }) => Promise<Output>;
}) {
  return async (rawInput: unknown): Promise<ActionResponse<Output>> => {
    const { session, requestInfo } = await getRequestContext();
    const context: ActionContext = {
      userId: session?.user?.id || "anonymous",
      userRole: session?.user?.role,
      userType: session?.user?.userType,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      session,
    };

    try {
      // Validate input
      const parseResult = config.schema.safeParse(rawInput);
      if (!parseResult.success) {
        throw new ValidationError(
          "Invalid input",
          formatZodErrors(parseResult.error)
        );
      }

      // Authentication & Authorization
      if (
        (config.metadata.requireAuth || config.metadata.requiredPermission) &&
        !session
      ) {
        throw new AuthorizationError("Authentication required");
      }
      if (
        config.metadata.requiredPermission &&
        !hasPermission(session, config.metadata.requiredPermission)
      ) {
        throw new AuthorizationError("Permission denied");
      }

      const result = await config.execute({
        input: parseResult.data,
        context,
      });

      // Log success
      await ActivityService.record({
        type: `${config.metadata.name}:execute`,
        actorId: context.userId,
        actorType: context.userType,
        actorRole: context.userRole,
        status: "succeeded",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        description: config.metadata.description,
        ...(config.metadata.entityType
          ? { entityType: config.metadata.entityType }
          : {}),
        metadata: {
          result: "success",
          input: redactSensitiveData(
            parseResult.data,
            config.metadata.formFields
          ),
        },
      });

      batchRevalidate({
        paths: config.metadata.revalidatePaths,
        tags: config.metadata.revalidateTags,
      });

      return { success: true, data: result };
    } catch (error) {
      return handleActionError(error, config.metadata, context);
    }
  };
}
