// src/lib/services/activity.service.ts
import { eq } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  ActivityInput,
  ActivityRecord,
  activities,
} from "@/drizzle/schema/system-settings/activities";
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
    activityId: string;
    error: unknown;
    status?: ErrorLogInput["status"];
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
    const activity = await this.record({
      ...input,
      status: "started",
    });

    try {
      // Execute the operation
      const result = await operation();

      // Mark as succeeded
      const updatedActivity = await this.update(activity.id, {
        status: "succeeded",
        completedAt: new Date(),
      });

      return { result, activity: updatedActivity };
    } catch (error) {
      // Handle the error
      const appError = toAppError(error);

      // Update activity with error details
      const updatedActivity = await this.update(activity.id, {
        status: "failed",
        errorCode: appError.code,
        errorMessage: appError.message,
        completedAt: new Date(),
        metadata: {
          ...(input.metadata || {}),
          errorId: appError.errorId,
        },
      });

      // Record full error details if not operational
      let errorLog: ErrorLogRecord | undefined;
      if (!appError.isOperational) {
        errorLog = await this.recordError({
          activityId: activity.id,
          error: appError,
          status: appError.severity === "critical" ? "critical" : "unhandled",
        });
      }

      return {
        activity: updatedActivity,
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
