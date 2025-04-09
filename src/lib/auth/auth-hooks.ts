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
import { ServerSession } from "@/lib/auth/auth";
import {
  forgotPassword,
  getSession,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from "@/lib/auth/auth-actions";
import { useAuthStore } from "@/lib/auth/auth-store";
import { handleActionResponse } from "@/lib/errors/action-response-handler";
import { AppError, ValidationError } from "@/lib/errors/app-error-classes";
import {
  convertToAppError,
  isSerializedAppError,
} from "@/lib/errors/error-converter";

/**
 * Session hook with improved error handling
 */
export function useSession() {
  const { setUser, setError, setLoading, setInitialized, isSigningOut } =
    useAuthStore();

  const query = useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      setLoading(true);

      try {
        // handleActionResponse will return the data or throw
        const result = await getSession();
        const sessionData = handleActionResponse(result);

        // If we get here, we have successful data
        // Update the user in the store right away
        if (sessionData) {
          setUser(sessionData.user || null);
        }

        return sessionData;
      } catch (error) {
        // If handleActionResponse throws, we'll catch it here
        setError(convertToAppError(error));
        setInitialized(true);
        throw error; // Rethrow for React Query's error handling
      } finally {
        setInitialized(true);
        setLoading(false);
      }
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    meta: {
      skipGlobalErrorHandler: true, // We handle errors in the store
    },
  });

  // Cleanup effect to handle component unmount during loading
  useEffect(() => {
    return () => {
      if (query.isPending) {
        setLoading(false);
        if (!query.data) {
          setInitialized(true);
        }
      }
    };
  }, [query.isPending, query.data, setLoading, setInitialized]);

  return query;
}
/**
 * Sign in hook with robust error handling
 */
export function useSignIn(form?: UseFormReturn<SignInInput>) {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async (values: SignInInput) => {
      let result = await signIn(values);
      if (!result.success && result.error) {
        // Handle serialized error from server component
        if (isSerializedAppError(result.error)) {
          // Convert serialized error to an AppError instance
          throw AppError.fromSerialized(result.error);
        } else {
          // Fallback to generic conversion
          throw convertToAppError(result.error);
        }
      } else {
        // return handleActionResponse(result);
        result = await getSession();
        const sessionData = handleActionResponse(result);

        // If we get here, we have successful data
        // Update the user in the store right away
        if (sessionData) {
          setUser(sessionData.user || null);
        }

        return sessionData;
      }
    },
    onSuccess: async (data) => {
      // user data from signIn doesn't contain details like the role, userType and the onboardingComplete... So we do not set it. But we can call getSession in the mutation and return the result from it rather than that from signIn. So the signIn mutation will both signIn and getSession and then return the session data. The reason is son that the session data is available as soon as the user signIn mutation is done, with no lag waiting for getSession to finish.
      // setUser(data.user || null);

      // Handle successful sign in
      toast.success(`Welcome back, ${data?.user?.name?.split(" ")[0] || ""}!`);
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      router.push("/");
    },
    onError: (error) => {
      // If it's an AppError with field validation details, set form errors
      if (error instanceof AppError && error.hasValidationDetails() && form) {
        Object.entries(error.details!).forEach(([field, messages]) => {
          form.setError(field as keyof SignInInput, {
            type: "server",
            message: Array.isArray(messages)
              ? messages.join(", ")
              : String(messages),
          });
        });
      }
      // If it's specifically a ValidationError, only set form errors (no toast)
      else if (error instanceof ValidationError && form) {
        Object.entries(error.details!).forEach(([field, messages]) => {
          form.setError(field as keyof SignInInput, {
            type: "server",
            message: Array.isArray(messages)
              ? messages.join(", ")
              : String(messages),
          });
        });
      }
      // All other errors will be handled by QueryProvider's onError
    },
  });
}
/**
 * Sign up hook with robust error handling
 */
export function useSignUp(form?: UseFormReturn<SignUpInput>) {
  return useMutation({
    mutationFn: async (values: SignUpInput) => {
      const result = await signUp(values);
      return handleActionResponse(result);
    },
    onSuccess: () => {
      toast.success(
        "Account created! Please check your email to verify your account."
      );
      form?.reset();
    },
    onError: (error) => {
      // If it's an AppError with field validation details, set form errors
      if (error instanceof AppError && error.hasValidationDetails() && form) {
        Object.entries(error.details!).forEach(([field, messages]) => {
          form.setError(field as keyof SignUpInput, {
            type: "server",
            message: Array.isArray(messages)
              ? messages.join(", ")
              : String(messages),
          });
        });
      }
      // Other errors will be handled by QueryProvider
    },
  });
}

/**
 * Forgot password hook with robust error handling
 */
export function useForgotPassword(form?: UseFormReturn<ForgotPasswordInput>) {
  return useMutation({
    mutationFn: async (values: ForgotPasswordInput) => {
      const result = await forgotPassword(values);
      return handleActionResponse(result);
    },
    onSuccess: () => {
      toast.success("Password reset email sent! Check your inbox.");
      form?.reset();
    },
    onError: (error) => {
      // If it's an AppError with field validation details, set form errors
      if (error instanceof AppError && error.hasValidationDetails() && form) {
        Object.entries(error.details!).forEach(([field, messages]) => {
          form.setError(field as keyof ForgotPasswordInput, {
            type: "server",
            message: Array.isArray(messages)
              ? messages.join(", ")
              : String(messages),
          });
        });
      }
      // Other errors will be handled by QueryProvider
    },
  });
}

/**
 * Reset password hook with robust error handling
 */
export function useResetPassword(form?: UseFormReturn<ResetPasswordInput>) {
  const router = useRouter();

  return useMutation({
    mutationFn: async (values: ResetPasswordInput) => {
      const result = await resetPassword(values);
      return handleActionResponse(result);
    },
    onSuccess: () => {
      toast.success("Password reset successfully!");
      form?.reset();
      router.push("/sign-in");
    },
    onError: (error) => {
      // If it's an AppError with field validation details, set form errors
      if (error instanceof AppError && error.hasValidationDetails() && form) {
        Object.entries(error.details!).forEach(([field, messages]) => {
          form.setError(field as keyof ResetPasswordInput, {
            type: "server",
            message: Array.isArray(messages)
              ? messages.join(", ")
              : String(messages),
          });
        });
      }

      // Special case for invalid token
      if (error instanceof AppError && error.code?.includes("INVALID_TOKEN")) {
        toast.error("Your password reset link has expired or is invalid", {
          description:
            "Please request a new link from the forgot password page.",
          action: {
            label: "Try Again",
            onClick: () => router.push("/forgot-password"),
          },
        });
      }
      // Other errors will be handled by QueryProvider
    },
  });
}

/**
 * Sign out hook with robust error handling
 */
export function useSignOut() {
  const { logout, setSigningOut } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      // setSigningOut(true);

      // Clear relevant queries
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.removeQueries({ queryKey: ["auth"] });

      // Perhaps clear other relevant queries that depend on the user
      queryClient.removeQueries({ queryKey: ["user-profile"] });
      queryClient.removeQueries({ queryKey: ["petitions"] });

      const result = await signOut();
      return handleActionResponse(result);
    },
    onSuccess: () => {
      toast.success("You have been signed out");

      // Navigate to sign-in page after a delay
      // setTimeout(() => {
      //   router.push("/sign-in");
      // }, 500);
      router.push("/sign-in");
    },
    onError: () => {
      // Even if server logout fails, we've already logged out locally
      toast.info("Signed out locally");

      // Navigate to sign-in page after a delay
      setTimeout(() => {
        router.push("/sign-in");
      }, 500);
    },
    onSettled: () => {
      // Always logout locally first
      logout();
    },
  });
}
