// src/components/auth/session-status.tsx
"use client";

import { ReactNode } from "react";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

import { useSessionStatus } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";

// src/components/auth/session-status.tsx

interface SessionStatusProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  showLoadingUI?: boolean;
  showErrorUI?: boolean;
  className?: string;
}

/**
 * SessionStatus - Place this component wherever you want session loading/error UI
 */
export function SessionStatus({
  children,
  loadingFallback,
  errorFallback,
  showLoadingUI = true,
  showErrorUI = true,
  className = "",
}: SessionStatusProps) {
  const { isLoading, error, retryCount, manualRetry } = useSessionStatus();

  // Show error UI if there's an error
  if (error && showErrorUI) {
    if (errorFallback) return <>{errorFallback}</>;

    return (
      <div
        className={`flex flex-col items-center justify-center gap-4 p-4 text-center ${className}`}
      >
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div>
          <h3 className="text-lg font-semibold">Session Error</h3>
          <p className="text-sm text-muted-foreground">
            There was a problem loading your session.
          </p>
        </div>
        <Button onClick={manualRetry} size="sm" variant="outline">
          <RefreshCw className="mr-2 h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  // Show loading UI
  if (isLoading && showLoadingUI) {
    if (loadingFallback) return <>{loadingFallback}</>;

    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 p-4 ${className}`}
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">
          {retryCount > 0 ? `Loading (retry ${retryCount})...` : "Loading..."}
        </p>
      </div>
    );
  }

  // Return children when no loading or error
  return <>{children}</>;
}
