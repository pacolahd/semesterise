"use server";

import {
  signInSchema,
  signUpSchema,
} from "@/drizzle/schema/auth/signin-signup-schema";
import { authClient } from "@/lib/auth/auth-client";
import { SignInError, SignUpError, handleAuthError } from "@/lib/errors";
import { createValidatedAction } from "@/lib/server-action-wrapper";

export const signUp = createValidatedAction({
  metadata: {
    name: "auth:sign-up",
    description: "Register a new user account",
    revalidatePaths: ["/auth/signup"],
    sensitiveFields: ["password", "confirmPassword"],
    requireAuth: false,
  },
  schema: signUpSchema,
  execute: async ({ input }) => {
    const { data: authData, error } = await authClient.signUp.email({
      email: input.email.toLowerCase(),
      password: input.password,
      name: input.name,
    });

    if (error) {
      // console.error("\n\n\nSign up Action - Sign up error:", error);
      const authError = handleAuthError(error);
      throw new SignUpError({
        message:
          // eslint-disable-next-line eqeqeq
          authError.message != "Generic"
            ? authError.message
            : "Sign up failed. Please try again.",
        details: authError.details,
        status: authError.status,
        code: authError.code,
      });
    }

    return authData;
  },
});

export const signIn = createValidatedAction({
  metadata: {
    name: "auth:sign-in",
    description: "Sign in to user account",
    revalidatePaths: ["/auth/signin"],
    sensitiveFields: ["password"],
    requireAuth: false,
  },
  schema: signInSchema,
  execute: async ({ input }) => {
    const { data: authData, error } = await authClient.signIn.email({
      email: input.email.toLowerCase(),
      password: input.password,
    });

    if (error) {
      console.error("Sign In error:", error);
      const authError = handleAuthError(error);
      throw new SignUpError({
        message:
          // eslint-disable-next-line eqeqeq
          authError.message != "Generic"
            ? authError.message
            : "Sign in failed. Please try again.",
        details: authError.details,
        status: authError.status,
        code: authError.code,
      });
    }

    return authData;
  },
});
