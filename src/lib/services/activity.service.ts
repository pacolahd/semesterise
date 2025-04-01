// src/lib/services/activity.service.ts
import { eq } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  ActivityInput,
  ActivityRecord,
  activities,
} from "@/drizzle/schema/system-settings/activities";
import { ErrorStatus } from "@/drizzle/schema/system-settings/enums";
import {
  ErrorLogInput,
  ErrorLogRecord,
  errorLogs,
} from "@/drizzle/schema/system-settings/error-logs";
import { AppError, toAppError } from "@/lib/errors";

export class ActivityService {
  /**
   * Records a new activity
   */
  static async record(input: ActivityInput): Promise<ActivityRecord> {
    const [activity] = await db.insert(activities).values(input).returning();
    return activity;
  }

  /**
   * Updates an existing activity
   */
  static async update(
    activityId: string,
    updates: Partial<ActivityInput>
  ): Promise<ActivityRecord> {
    const [activity] = await db
      .update(activities)
      .set(updates)
      .where(eq(activities.id, activityId))
      .returning();
    return activity;
  }

  /**
   * Records detailed error information
   */
  static async recordError(params: {
    activityId?: string;
    error: unknown;
    status?: ErrorStatus;
  }): Promise<ErrorLogRecord> {
    const appError = toAppError(params.error);
    const errorInput: ErrorLogInput = {
      ...appError.toLog(),
      activityId: params.activityId,
      status:
        params.status || appError.severity === "critical"
          ? "critical"
          : "unhandled",
    };

    const [error] = await db.insert(errorLogs).values(errorInput).returning();

    return error;
  }

  /**
   * Tracks an operation with automatic activity and error logging
   */
  static async track<T>(
    input: Omit<ActivityInput, "status">,
    operation: () => Promise<T>
  ): Promise<{
    result?: T;
    activity: ActivityRecord;
    error?: AppError;
    errorLog?: ErrorLogRecord;
  }> {
    // Start the activity
    let activity = await this.record({
      ...input,
      status: "started",
    });

    try {
      // Execute the operation
      const result = await operation();

      // Mark as succeeded
      activity = await this.update(activity.id, {
        status: "succeeded",
        completedAt: new Date(),
      });

      return { result, activity };
    } catch (error) {
      // console.error("\n\n\n\n\nError in operation:", error);
      // Handle the error
      const appError = toAppError(error);

      // Record error FIRST
      const errorLog = await this.recordError({
        activityId: activity.id,
        error: appError,
        status: appError.severity === "critical" ? "critical" : "unhandled",
      });

      // Then update the activity
      activity = await this.update(activity.id, {
        status: "failed",
        // completedAt: new Date(),
        metadata: {
          ...(input.metadata || {}),
          // errorId: appError.errorId,
        },
      });

      return {
        activity,
        error: appError,
        errorLog,
      };
    }
  }

  /**
   * Formats an error for API responses
   */
  static toResponse(error: unknown): {
    success: false;
    error: {
      code: string;
      message: string;
      details?: Record<string, string[]>;
      status?: number;
    };
  } {
    const appError = toAppError(error);
    return {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
        status: appError.status,
      },
    };
  }
}
