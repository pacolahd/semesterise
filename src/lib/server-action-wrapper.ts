// src/lib/server-actions.ts
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";

import { AuthenticationError } from "gel";
import { type ZodSchema, z } from "zod";

import { ServerSession, auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/authorization";
import { AuthorizationError, ValidationError } from "@/lib/errors/errors";
import { ActivityService } from "@/lib/services/activity.service";
import type { Permission } from "@/lib/types";
import { redactSensitiveData } from "@/lib/utils/redaction";

// ======================
// 1. Type Definitions (unchanged)
// ======================
type BaseActionMetadata = {
  name: string;
  description?: string;
  entityType?: string;
  revalidatePaths?: string[];
  revalidateTags?: string[];
  sensitiveFields?: string[];
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
  // session?: Awaited<ReturnType<typeof auth.api.getSession>>;
  session: ServerSession | null;
};

type ActionResponse<T = void> =
  | { success: true; data?: T; status?: number }
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
// 2. Core Utilities (unchanged)
// ======================
async function getRequestContext() {
  const headersList = await headers();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const session: ServerSession | null = await auth.api.getSession({
    headers: headersList,
  });

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

// ======================
// 3. Updated Action Creators
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
      // Auth checks
      if (
        (config.metadata.requireAuth || config.metadata.requiredPermission) &&
        !session
      ) {
        throw new AuthenticationError("Authentication required");
      }
      if (
        config.metadata.requiredPermission &&
        !hasPermission(session, config.metadata.requiredPermission)
      ) {
        throw new AuthorizationError("Permission denied");
      }

      // Execute with automatic tracking
      const trackingResult = await ActivityService.track(
        {
          type: `${config.metadata.name}:execute`,
          actorId: context.userId,
          actorType: context.userType,
          actorRole: context.userRole,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          description: config.metadata.description,
          ...(config.metadata.entityType
            ? { entityType: config.metadata.entityType }
            : {}),
          metadata: {
            action: config.metadata.name,
          },
        },
        async () => config.execute({ context })
      );

      batchRevalidate({
        paths: config.metadata.revalidatePaths,
        tags: config.metadata.revalidateTags,
      });

      return trackingResult.error
        ? ActivityService.toResponse(trackingResult.error)
        : { success: true, data: trackingResult.result };
    } catch (error) {
      return ActivityService.toResponse(error);
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
      // Auth checks
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

      // Execute with automatic tracking
      const { result, error } = await ActivityService.track(
        {
          type: `${config.metadata.name}:execute`,
          actorId: context.userId,
          actorType: context.userType,
          actorRole: context.userRole,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          description: config.metadata.description,
          ...(config.metadata.entityType
            ? { entityType: config.metadata.entityType }
            : {}),
          metadata: {
            action: config.metadata.name,
            input: redactSensitiveData(
              input as Record<string, unknown>,
              config.metadata.sensitiveFields
            ),
          },
        },
        async () => config.execute({ input, context })
      );

      batchRevalidate({
        paths: config.metadata.revalidatePaths,
        tags: config.metadata.revalidateTags,
      });

      return error
        ? ActivityService.toResponse(error)
        : { success: true, data: result };
    } catch (error) {
      return ActivityService.toResponse(error);
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

      // Auth checks
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

      // Execute with automatic tracking
      const trackingResult = await ActivityService.track(
        {
          type: `${config.metadata.name}:execute`,
          actorId: context.userId,
          actorType: context.userType,
          actorRole: context.userRole,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          description: config.metadata.description,
          ...(config.metadata.entityType
            ? { entityType: config.metadata.entityType }
            : {}),
          metadata: {
            action: config.metadata.name,
            input: redactSensitiveData(
              parseResult.data,
              config.metadata.sensitiveFields
            ),
          },
        },
        async () => config.execute({ input: parseResult.data, context })
      );

      batchRevalidate({
        paths: config.metadata.revalidatePaths,
        tags: config.metadata.revalidateTags,
      });

      return trackingResult.error
        ? ActivityService.toResponse(trackingResult.error)
        : { success: true, data: trackingResult.result };
    } catch (error) {
      return ActivityService.toResponse(error);
    }
  };
}
