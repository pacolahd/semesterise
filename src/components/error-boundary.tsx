"use client";

import {
  Component,
  ComponentType,
  ErrorInfo,
  JSX,
  ReactNode,
  useEffect,
} from "react";

import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { AppError } from "@/lib/errors/app-error-classes";
import { convertToAppError } from "@/lib/errors/error-converter";

// Types for the error boundary props
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: AppError, reset: () => void) => ReactNode);
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  showToast?: boolean;
}

// State for the error boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

/**
 * A React Error Boundary component that integrates with the app's error handling system
 * Can be used to wrap components that might throw errors during rendering
 */
class ErrorBoundaryComponent extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    // Convert any error to an AppError
    const appError =
      error instanceof AppError ? error : convertToAppError(error);

    return {
      hasError: true,
      error: appError,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Convert to AppError for consistency
    const appError =
      error instanceof AppError ? error : convertToAppError(error);

    // Log the error
    console.error("Error caught by boundary:", appError, errorInfo);

    // Show toast if enabled
    if (this.props.showToast) {
      toast.error(appError.message, {
        description: "An error occurred in this section of the page.",
      });
    }

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(appError, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset the error state if props change and resetOnPropsChange is true
    if (
      this.state.hasError &&
      this.props.resetOnPropsChange &&
      prevProps.children !== this.props.children
    ) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use the custom fallback if provided
      if (this.props.fallback) {
        // If fallback is a function, call it with the error and reset function
        if (typeof this.props.fallback === "function") {
          return this.props.fallback(this.state.error, this.resetErrorBoundary);
        }
        // Otherwise, just render the fallback
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center space-y-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/50">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-300">
            Something went wrong
          </h2>
          <p className="max-w-md text-red-600 dark:text-red-400">
            {this.state.error.message || "An unexpected error occurred"}
          </p>
          {this.state.error.code && (
            <p className="text-sm text-red-500 dark:text-red-400">
              Error code: {this.state.error.code}
            </p>
          )}
          <button
            onClick={this.resetErrorBoundary}
            className="mt-4 rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
          >
            Try again
          </button>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

/**
 * Hook to handle global unhandled errors
 */
function useGlobalErrorHandler() {
  useEffect(() => {
    // Handle global unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Convert to AppError for consistent formatting
      const appError = convertToAppError(event.reason);
      console.error("Unhandled promise rejection:", appError);

      // Show toast notification
      toast.error(appError.message, {
        description: "An unhandled error occurred in the application.",
      });

      // Prevent default to avoid console errors
      event.preventDefault();
    };

    // Handle global errors
    const handleError = (event: ErrorEvent) => {
      // Convert to AppError for consistent formatting
      const appError = convertToAppError(event.error || event.message);
      console.error("Global error:", appError);

      // Show toast notification
      toast.error(appError.message, {
        description: "An error occurred in the application.",
      });

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
}

/**
 * Combined ErrorBoundary component with global error handling
 */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  // Set up global error handling
  useGlobalErrorHandler();

  // Render the error boundary component
  return <ErrorBoundaryComponent {...props} />;
}

/**
 * Custom hook that lets components use the ErrorBoundary's reset functionality
 * This can be used to reset an error boundary from deeply nested components
 */
export function withErrorBoundary<P extends JSX.IntrinsicAttributes>(
  Component: ComponentType<P>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, "children">
): ComponentType<P> {
  const WithErrorBoundary = (props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WithErrorBoundary.displayName = `WithErrorBoundary(${
    Component.displayName || Component.name || "Component"
  })`;

  return WithErrorBoundary;
}
