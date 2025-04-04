"use client";

import { ClientSideErrorLogger } from "@/lib/errors/client/client-side-error-logger";

// lib/log-client-error.ts

export const logClientError = async (error: unknown) => {
  try {
    await ClientSideErrorLogger(error);
  } catch (loggingError) {
    console.error("Failed to send error log:", loggingError);
  }
};
