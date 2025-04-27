"use client";

import dynamic from "next/dynamic";
import React, { useState } from "react";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { AppError, ValidationError } from "@/lib/errors/app-error-classes";
import { convertToAppError } from "@/lib/errors/error-converter";

// Import DevTools using Next.js dynamic import with ssr disabled
const ReactQueryDevtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then(
      (mod) => mod.ReactQueryDevtools
    ),
  { ssr: false }
);

/**
 * Provides an appropriate error message for display
 */
function formatErrorForDisplay(error: unknown): string {
  // If it's already an AppError, use its message
  if (error instanceof AppError) {
    return error.toUserMessage();
  }

  // Otherwise, convert to AppError first
  const appError = convertToAppError(error);
  return appError.toUserMessage();
}

/**
 * React Query Provider with comprehensive error handling
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            networkMode: "always", // Better for Next.js
            retry: (failureCount: number, error: unknown) => {
              const appError =
                error instanceof AppError ? error : convertToAppError(error);

              // Customize retry behavior based on error
              switch (appError.code) {
                // Retry network errors more times
                case "NETWORK_ERROR":
                  return failureCount < 3;

                // Don't retry auth errors
                case "SESSION_EXPIRED":
                case "FAILED_TO_CREATE_SESSION":
                case "FAILED_TO_GET_SESSION":
                case "INVALID_TOKEN":
                case "NO_SESSION": // I'm not sure if we'll ever get this though, it's not part of the better auth stuff
                  return false;

                // Don't retry validation errors
                case "VALIDATION_ERROR":
                  return false;
              }

              // Don't retry based on status codes
              if (appError.status === 401 || appError.status === 403) {
                return false;
              }

              // Default: retry once for other errors
              return failureCount < 1;
            },
            staleTime: 1000 * 60 * 5, // 5 minutes
          },
          mutations: {
            networkMode: "always",
            // Don't retry mutations by default
            retry: false,
          },
        },
        // Error handling for queries
        queryCache: new QueryCache({
          onError: (error, query) => {
            // Skip global error handling for queries that opt out
            if (query.options.meta?.skipGlobalErrorHandler) {
              return;
            }

            const appError =
              error instanceof AppError ? error : convertToAppError(error);

            // Don't show toasts for validation errors
            if (appError instanceof ValidationError) {
              return;
            }

            // Skip toasts for errors with validation details
            if (appError.hasValidationDetails()) {
              return;
            }

            // Network errors get a special toast with retry action
            if (appError.code === "NETWORK_ERROR") {
              toast.error(appError.message, {
                description: "Check your internet connection and try again.",
                action: {
                  label: "Retry",
                  onClick: () => query.fetch(),
                },
              });
              return;
            }

            // if the message contains "relation"
            if (appError.message?.includes("relation")) {
              toast.error(
                "Chale, It seems there's a problem with the database 🥲 Please contact support or try again later"
              );
              return;
            }

            // Session/auth errors that should redirect to login
            if (
              appError.status === 401 ||
              appError.code === "SESSION_EXPIRED" ||
              appError.code === "NO_SESSION"
            ) {
              toast.error(appError.message, {
                description: "Please sign in to continue.",
                action: {
                  label: "Sign In",
                  onClick: () => {
                    window.location.href = "/sign-in";
                  },
                },
              });
              return;
            }

            // Standard error toast
            toast.error(formatErrorForDisplay(error));

            // Log detailed error in development
            if (process.env.NODE_ENV !== "production") {
              console.group("Query Error");
              console.error(appError);
              console.groupEnd();
            }
          },
        }),
        // Error handling for mutations
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            // Skip global error handling for mutations that opt out
            if (mutation.options.meta?.skipGlobalErrorHandler) {
              return;
            }

            const appError =
              error instanceof AppError ? error : convertToAppError(error);

            // Skip toast for validation errors - they should be handled by forms
            if (appError instanceof ValidationError) {
              return;
            }

            // Skip toasts for errors with validation details
            if (appError.hasValidationDetails()) {
              if (appError.details!.errors) {
                appError.details!.errors.forEach((error) => toast.error(error));
              }
              return;
            }

            // if the message contains "relation"
            if (appError.message?.includes("relation")) {
              toast.error("Chale, There' an issue with the database 🥲", {
                description: "Please contact support or try again later",
              });
              return;
            }
            if (appError.message?.includes("summer")) {
              toast.error("Chale, SUMMER!!", {
                description: `${appError.status} ${appError.originalError} ${appError.details} ${appError.source}`,
              });
              console.log("\n\n\n" + appError);
              return;
            }

            // Show appropriate toast message
            toast.error(formatErrorForDisplay(error));

            // Log detailed error in development
            if (process.env.NODE_ENV !== "production") {
              console.group("Mutation Error");
              console.error(appError);
              console.groupEnd();
            }
          },
        }),
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
