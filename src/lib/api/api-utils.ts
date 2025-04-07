// src/lib/api/api-utils.ts
import { toast } from "sonner";

// Typed API error for consistent error handling
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Helper function to parse API responses
export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Error: ${response.status} ${response.statusText}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // If response isn't JSON, use status text
    }

    throw new ApiError(errorMessage, response.status);
  }

  // Handle empty responses
  if (
    response.status === 204 ||
    response.headers.get("content-length") === "0"
  ) {
    return {} as T;
  }

  return await response.json();
}

// Standardized fetch wrapper for use with TanStack Query
export const fetchWrapper = {
  get: async <T>(url: string, options?: RequestInit): Promise<T> => {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });
    return parseApiResponse<T>(response);
  },

  post: async <T>(
    url: string,
    body: unknown,
    options?: RequestInit
  ): Promise<T> => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(body),
      ...options,
    });
    return parseApiResponse<T>(response);
  },

  put: async <T>(
    url: string,
    body: unknown,
    options?: RequestInit
  ): Promise<T> => {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(body),
      ...options,
    });
    return parseApiResponse<T>(response);
  },

  delete: async <T>(url: string, options?: RequestInit): Promise<T> => {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });
    return parseApiResponse<T>(response);
  },

  // For file uploads and form data
  formData: async <T>(
    url: string,
    formData: FormData,
    options?: RequestInit
  ): Promise<T> => {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      ...options,
    });
    return parseApiResponse<T>(response);
  },
};

// Error notification utility
export function notifyError(message: string): void {
  toast.error(message);
}
