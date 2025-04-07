"use client";

import React, { Component, ErrorInfo, ReactNode, useEffect } from "react";

import { toast } from "sonner";

// src/components/error-boundary.tsx

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// React Error Boundary for rendering errors
class ErrorBoundaryComponent extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    toast.error(`An error occurred: ${error.message}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-[400px] w-full flex-col items-center justify-center space-y-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/50">
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-300">
              Something went wrong
            </h2>
            <p className="text-red-600 dark:text-red-400">
              The application encountered an error. Please try refreshing the
              page.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Global event handler wrapper
export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  useEffect(() => {
    // Handle global unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      toast.error(
        `Unhandled error: ${event.reason?.message || "Something went wrong"}`
      );
      // Prevent default to avoid console errors
      event.preventDefault();
    };

    // Handle global errors
    const handleError = (event: ErrorEvent) => {
      console.error("Global error:", event.error || event.message);
      toast.error(`Error: ${event.message || "Something went wrong"}`);
      // Prevent default to avoid console errors
      event.preventDefault();
    };

    // Add event listeners
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <ErrorBoundaryComponent fallback={fallback}>
      {children}
    </ErrorBoundaryComponent>
  );
}
