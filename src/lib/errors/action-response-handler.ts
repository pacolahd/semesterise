// src/lib/errors/action-response-handler.ts
import { ActionResponse } from "../types/common";
import { AppError } from "./app-error-classes";
import { convertToAppError, isSerializedAppError } from "./error-converter";

/**
 * Processes an ActionResponse and either:
 * - Returns the data if successful
 * - Throws an AppError if failure
 *
 * This is designed to work with React Query's error handling
 */
export function handleActionResponse<T>(result: ActionResponse<T>): T {
  if (!result.success && result.error) {
    // Handle serialized error from server component
    if (isSerializedAppError(result.error)) {
      // Convert serialized error to an AppError instance
      throw AppError.fromSerialized(result.error);
    } else {
      // Fallback to generic conversion
      throw convertToAppError(result.error);
    }
  }

  // If successful, return the data (possibly undefined)
  return result.data as T;
}
