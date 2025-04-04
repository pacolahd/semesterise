"use server";

import { toAppError } from "@/lib/errors/errors";
import { ActivityService } from "@/lib/services/activity.service";

// app/actions/client-side-log-client-error.ts

export const ClientSideErrorLogger = async (error: unknown) => {
  try {
    const appError = toAppError(error, "SignInError");

    return ActivityService.recordError({
      error: appError,
      status: "critical", // or determine based on error type
      activityId: undefined, // Optional: Add if you have activity tracking
    });
  } catch (loggingError) {
    console.error("Failed to log client error:", loggingError);
  }
};
