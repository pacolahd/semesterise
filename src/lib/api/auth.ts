"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import {
  ForgotPasswordInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "@/drizzle/schema/auth/signin-signup-schema";
import {
  forgotPassword,
  getSession,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from "@/lib/actions/auth-actions";
import { useAuthStore } from "@/lib/state/auth";

// Session hook with cleanup
export function useSession() {
  const { setUser, setError, setLoading, setInitialized } = useAuthStore();

  const query = useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      setLoading(true);

      try {
        const result = await getSession();

        if (!result.success) {
          setError(result.error?.message || "Authentication failed");
          setInitialized(true);
          setLoading(false);
          return null;
        }

        // Extract user from session data
        const userData = result.data?.user || null;
        setUser(userData);
        setInitialized(true);

        return result.data;
      } catch (error) {
        console.error("Session fetch error:", error);
        setError(
          error instanceof Error ? error.message : "Session fetch failed"
        );
        setInitialized(true);
        setLoading(false);
        return null;
      }
    },

    // When a user switches tabs and comes back to Semesterise, session data won't automatically refetch
    refetchOnWindowFocus: false,

    //When a user navigates between pages in the app, the session data will refetch when a component using useSession mounts
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2; // Try max 2 times
    },
    gcTime: 10 * 60 * 1000, // 10 minutes
    meta: {
      skipGlobalErrorHandler: true,
    },
  });

  // Add cleanup effect to reset loading state on unmount
  useEffect(() => {
    return () => {
      // Reset loading if component unmounts during a pending query
      if (query.isPending) {
        setLoading(false);

        // Optional: If you want to also ensure the initialized state is consistent
        if (!query.data) {
          setInitialized(true);
        }
      }
    };
  }, [query.isPending, query.data, setLoading, setInitialized]);

  return query;
}

// Sign in hook - restructured to use primarily onSettled
export function useSignIn(form?: UseFormReturn<SignInInput>) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (values: SignInInput) => {
      try {
        return await signIn(values);
      } catch (error) {
        _error = error as Error;
        return {
          success: false,
          error: { message: `${_error.name}: ${_error.message}` },
        };
      }
    },
    onSettled: (result) => {
      if (!result) return;

      if (result.success) {
        // Success case
        toast.success(
          `Welcome back, ${result?.data?.user?.name?.split(" ")[0] || ""}!`
        );
        queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
        router.push("/");
      } else if (result.error?.details && form) {
        // Form field errors
        Object.entries(result.error.details).forEach(([field, messages]) => {
          form.setError(field as keyof SignInInput, {
            type: "server",
            message: Array.isArray(messages)
              ? messages.join(", ")
              : String(messages),
          });
        });
      } else if (result.error) {
        // Generic error
        toast.error(result.error.message || "Sign in failed");
      }
    },
    meta: {
      skipGlobalErrorHandler: true,
    },
  });
}

// Sign up hook - restructured
export function useSignUp(form?: UseFormReturn<SignUpInput>) {
  return useMutation({
    mutationFn: async (values: SignUpInput) => {
      return await signUp(values);
    },
    onSettled: (result) => {
      if (!result) return;

      if (result.success) {
        // Success case
        toast.success(
          "Account created! Please check your email to verify your account."
        );
        form?.reset();
      } else if (result.error?.details && form) {
        // Form field errors
        Object.entries(result.error.details).forEach(([field, messages]) => {
          form.setError(field as keyof SignUpInput, {
            type: "server",
            message: Array.isArray(messages)
              ? messages.join(", ")
              : String(messages),
          });
        });
      } else if (result.error) {
        // Generic error
        toast.error(result.error.message || "Sign up failed");
      }
    },
    meta: {
      skipGlobalErrorHandler: true,
    },
  });
}

// Sign out hook - restructured
export function useSignOut() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      // Always logout locally first
      logout();

      // Clear relevant queries
      // i.e Telling React Query that cached data with those keys is no longer valid and should be refetched.
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.removeQueries({ queryKey: ["auth"] });

      // Also clear other queries that may be related
      queryClient.removeQueries({ queryKey: ["user-profile"] });
      queryClient.removeQueries({ queryKey: ["petitions"] });

      return await signOut();
    },
    onSettled: (result) => {
      if (!result) {
        // This shouldn't happen, but just in case
        toast.info("Signed out locally");
      } else if (result.success) {
        toast.success("You have been signed out");
      } else {
        // Partial success - still logged out locally
        toast.info(result.error?.message || "Signed out locally");
      }

      // Navigate to sign-in page after a delay
      setTimeout(() => {
        router.push("/sign-in");
      }, 500);
    },
    meta: {
      skipGlobalErrorHandler: true,
    },
  });
}

// Forgot password hook - restructured
export function useForgotPassword(form?: UseFormReturn<ForgotPasswordInput>) {
  return useMutation({
    mutationFn: async (values: ForgotPasswordInput) => {
      return await forgotPassword(values);
    },
    onSettled: (result) => {
      if (!result) return;

      if (result.success) {
        // Success case
        toast.success("Password reset email sent! Check your inbox.");
        form?.reset();
      } else if (result.error?.details && form) {
        // Form field errors
        Object.entries(result.error.details).forEach(([field, messages]) => {
          form.setError(field as keyof ForgotPasswordInput, {
            type: "server",
            message: Array.isArray(messages)
              ? messages.join(", ")
              : String(messages),
          });
        });
      } else if (result.error) {
        // Generic error
        toast.error(result.error.message || "Failed to send reset link");
      }
    },
    meta: {
      skipGlobalErrorHandler: true,
    },
  });
}

// Reset password hook - restructured
export function useResetPassword(form?: UseFormReturn<ResetPasswordInput>) {
  const router = useRouter();

  return useMutation({
    mutationFn: async (values: ResetPasswordInput) => {
      return await resetPassword(values);
    },
    onSettled: (result) => {
      if (!result) return;

      if (result.success) {
        // Success case
        toast.success("Password reset successfully!");
        form?.reset();
        router.push("/sign-in");
      } else if (result.error?.details && form) {
        // Form field errors
        Object.entries(result.error.details).forEach(([field, messages]) => {
          form.setError(field as keyof ResetPasswordInput, {
            type: "server",
            message: Array.isArray(messages)
              ? messages.join(", ")
              : String(messages),
          });
        });
      } else if (result.error) {
        // Special case for invalid token
        if (result.error.code?.includes("INVALID_TOKEN")) {
          toast.error("Your password reset link has expired or is invalid", {
            description:
              "Please request a new link from the forgot password page.",
            action: {
              label: "Try Again",
              onClick: () => router.push("/forgot-password"),
            },
          });
        } else {
          // Generic error
          toast.error(result.error.message || "Failed to reset password");
        }
      }
    },
    meta: {
      skipGlobalErrorHandler: true,
    },
  });
}
