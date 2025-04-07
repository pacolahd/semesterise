// src/lib/state/auth.ts
import { z } from "zod";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ServerSessionUser } from "@/lib/auth/auth";

// Define a date transformer that can handle both Date objects and date strings
const dateTransformer = z.union([
  z.date(),
  z.string().transform((str) => new Date(str)),
]);

// Define user schema with proper date handling
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  userType: z.string(),
  role: z.string(),
  onboardingCompleted: z.boolean().optional().default(false),
  createdAt: dateTransformer,
  updatedAt: dateTransformer,
  image: z.string().optional().nullable(),
});

// Auth state interface
interface AuthState {
  user: z.infer<typeof userSchema> | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setUser: (user: ServerSessionUser | null) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  logout: () => void;
}

// Helper to ensure dates are Date objects
function ensureDates(user: ServerSessionUser | null): any {
  if (!user) return null;

  return {
    ...user,
    // Ensure createdAt and updatedAt are Date objects
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt
        : new Date(user.createdAt),
    updatedAt:
      user.updatedAt instanceof Date
        ? user.updatedAt
        : new Date(user.updatedAt),
    // Ensure onboardingCompleted has a default value
    onboardingCompleted: user.onboardingCompleted ?? false,
  };
}

// Storage keys
const STORAGE_KEY = "semesterise-auth";

// Create auth store directly with Zustand
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      isLoading: true,
      isInitialized: false,
      error: null,

      // Actions - with manual immutability
      setUser: (user) =>
        set({
          user: ensureDates(user),
          isLoading: false,
          isInitialized: true,
          error: null,
        }),

      setError: (error) =>
        set((state) => ({
          ...state,
          error,
          isLoading: false,
          isInitialized: true,
        })),

      setLoading: (isLoading) =>
        set((state) => ({
          ...state,
          isLoading,
        })),

      setInitialized: (initialized) =>
        set((state) => ({
          ...state,
          isInitialized: initialized,
        })),

      logout: () => {
        // Clear the Zustand store
        set({
          user: null,
          error: null,
          isLoading: false,
          isInitialized: true,
        });

        // Also completely remove persisted state
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
        }

        // Optionally clear session storage too if you use it
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      },
    }),
    {
      name: STORAGE_KEY,
      // Only store essential data
      partialize: (state) => ({
        user: state.user,
        isInitialized: state.isInitialized,
      }),
    }
  )
);
