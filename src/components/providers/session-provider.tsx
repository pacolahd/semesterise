// src/components/providers/session-provider.tsx
"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { useSession } from "@/lib/auth/auth-hooks";
import { useAuthStore } from "@/lib/auth/auth-store";

// src/components/providers/session-provider.tsx

// src/components/providers/session-provider.tsx

// Define context types
type SessionContextType = {
  isLoading: boolean;
  error: any;
  retryCount: number;
  manualRetry: () => void;
};

// Create context with default values
const SessionContext = createContext<SessionContextType>({
  isLoading: true,
  error: null,
  retryCount: 0,
  manualRetry: () => {},
});

// Hook to use session context
export const useSessionStatus = () => useContext(SessionContext);

/**
 * SessionProvider that only manages state, without rendering UI
 */
export function SessionProvider({
  children,
  initialTimeout = 5000,
  maxRetries = 3,
  maxTimeout = 15000,
}: {
  children: ReactNode;
  initialTimeout?: number;
  maxRetries?: number;
  maxTimeout?: number;
}) {
  const sessionQuery = useSession();
  const { isLoading, isInitialized } = useAuthStore();
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<any>(null);

  // Automatic retry with exponential backoff
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isLoading && !isInitialized) {
      // Calculate timeout with exponential backoff
      const currentTimeout = Math.min(
        initialTimeout * Math.pow(1.5, retryCount),
        maxTimeout
      );

      timeoutId = setTimeout(() => {
        // If we haven't exceeded max retries, retry automatically
        if (retryCount < maxRetries) {
          console.log(
            `Session loading timed out. Retry attempt ${retryCount + 1}/${maxRetries}`
          );
          setRetryCount((prev) => prev + 1);
          sessionQuery.refetch();
        } else {
          // After max retries, show error state
          console.warn("Session loading failed after maximum retry attempts");
          setError(new Error("Session loading timed out"));
        }
      }, currentTimeout);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    isLoading,
    isInitialized,
    retryCount,
    initialTimeout,
    maxRetries,
    maxTimeout,
    sessionQuery,
  ]);

  // Reset retry count when session is successfully initialized
  useEffect(() => {
    if (!isLoading && isInitialized) {
      setRetryCount(0);
      setError(null);
    }
  }, [isLoading, isInitialized]);

  // Handle manual retry
  const manualRetry = () => {
    setError(null);
    setRetryCount(0);
    sessionQuery.refetch();
  };

  // Provide session status without rendering any UI
  return (
    <SessionContext.Provider
      value={{
        isLoading: isLoading && !isInitialized,
        error,
        retryCount,
        manualRetry,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
