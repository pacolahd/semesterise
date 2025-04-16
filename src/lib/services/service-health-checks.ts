// src/lib/services/service-health.ts
/**
 * Utility functions to check the health of backend services
 */

/**
 * Check if the transcript parsing service is available
 * @returns Object with status and message
 */
export async function checkTranscriptServiceHealth(): Promise<{
  available: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Call the health check endpoint
    const response = await fetch("/api/transcript", {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        available: false,
        message:
          data.message || "Transcript service is not responding correctly",
        details: data.details || { statusCode: response.status },
      };
    }

    return {
      available: true,
      message: "Transcript service is available",
      details: data,
    };
  } catch (error) {
    console.error("Error checking transcript service health:", error);

    let message = "Cannot connect to transcript service";
    if (error instanceof Error) {
      message = `Connection error: ${error.message}`;
    }

    return {
      available: false,
      message,
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Retry the health check with exponential backoff
 * @param maxRetries Maximum number of retry attempts
 * @param initialDelay Initial delay in milliseconds
 * @returns The final health check result
 */
export async function checkWithRetry(
  maxRetries: number = 2,
  initialDelay: number = 1000
): Promise<{
  available: boolean;
  message: string;
  details?: any;
  attempts: number;
}> {
  let attempts = 0;
  let delay = initialDelay;

  while (attempts <= maxRetries) {
    const result = await checkTranscriptServiceHealth();
    attempts++;

    if (result.available) {
      return { ...result, attempts };
    }

    // If we've reached max retries, return the final result
    if (attempts >= maxRetries) {
      return { ...result, attempts };
    }

    // Wait before the next attempt (exponential backoff)
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay *= 2; // Double the delay for next attempt
  }

  // This should never be reached due to the return in the while loop
  return {
    available: false,
    message: "Service check failed after max retries",
    attempts,
  };
}
