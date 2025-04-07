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

// Import DevTools using Next.js dynamic import with ssr disabled
const ReactQueryDevtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then(
      (mod) => mod.ReactQueryDevtools
    ),
  { ssr: false }
);

// Expanded error type that matches your auth API responses
type QueryError = {
  status?: number;
  message?: string;
  code?: string;
  details?: Record<string, string[]>;
};

// Error handler function
function handleQueryError(error: unknown): string {
  // Handle error objects that match our QueryError type
  if (typeof error === "object" && error !== null) {
    // Check for API error response structure
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }

    if (
      error.code === "ECONNREFUSED" ||
      error.code === "ETIMEDOUT" ||
      error.code === "NETWORK_ERROR"
    ) {
      return "Network error. Please check your internet connection and try again.";
    }

    // Handle error.response pattern (common in Axios/Fetch)
    if (
      "response" in error &&
      typeof error.response === "object" &&
      error.response
    ) {
      const response = error.response as any;
      if (response.data?.message) return response.data.message;
      if (response.message) return response.message;
      if (response.statusText) return response.statusText;
    }
  }

  // Default message for unhandled error types
  return "An unexpected error occurred";
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            networkMode: "always", // Better for Next.js
            retry: (failureCount: number, error: unknown) => {
              // Type guard to check if error matches our QueryError structure
              const queryError = error as QueryError;

              // For network errors, retry up to 2 times
              if (queryError?.code === "NETWORK_ERROR") return failureCount < 3;

              // Don't retry auth errors
              if (queryError?.status === 401 || queryError?.status === 403) {
                return false;
              }

              // Don't retry if error indicates invalid token
              if (queryError?.code?.includes("INVALID_TOKEN")) {
                return false;
              }

              // For other errors, retry up to 2 times
              return failureCount < 2;
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
            // Skip global error handling for queries that handle their own errors
            if (query.options.meta?.skipGlobalErrorHandler) {
              return;
            }

            toast.error(handleQueryError(error));

            // Perhaps render cleaner error in production
            // toast.error(
            //   process.env.NODE_ENV === 'production'
            //     ? "Something went wrong. Please try again."
            //     : handleQueryError(error)
            // );
          },
        }),
        // Error handling for mutations
        mutationCache: new MutationCache({
          onError: (error, variables, context, mutation) => {
            // Skip global error handling for mutations that handle their own errors
            if (mutation.options.meta?.skipGlobalErrorHandler) {
              return;
            }

            toast.error(handleQueryError(error));
          },
        }),
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* eslint-disable-next-line no-process-env */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
