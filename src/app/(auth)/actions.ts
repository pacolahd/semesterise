"use server";

import { AuthUserRecord } from "@/drizzle/schema/auth/auth-users";
import {
  signInSchema,
  signUpSchema,
} from "@/drizzle/schema/auth/signin-signup-schema";
import { authClient } from "@/lib/auth/auth-client";
import { SignInError, SignUpError } from "@/lib/errors";
import { createValidatedAction } from "@/lib/server-action-wrapper";
import { ActivityService } from "@/lib/services/activity.service";
import { ActivityTypes } from "@/lib/types";

export const signUp = createValidatedAction({
  metadata: {
    name: "auth:sign-up",
    description: "Register a new user account",
    revalidatePaths: ["/auth/signup"],
    formFields: ["password", "confirmPassword"],
    requireAuth: false,
  },
  schema: signUpSchema,
  execute: async ({ input, context }) => {
    const { data: authData, error } = await authClient.signUp.email({
      email: input.email.toLowerCase(),
      password: input.password,
      name: input.name,
    });

    if (error) {
      console.error("Sign up error:", error);
      const details: Record<string, string[]> = {};

      // Handle common sign-up errors
      if (error.message?.includes("email")) {
        details.email = [error.message];
        throw new SignUpError({
          message: "Email Problem",
          details,
          status: 422,
        });
      }
      if (error.message?.includes("password")) {
        details.password = [error.message];
        throw new SignUpError({
          message: "Invalid password",
          details,
          status: 400,
        });
      }

      // Fallback for other errors
      throw new SignUpError({
        message: error.message || "Sign up failed",
        status: error.status || 400,
        code: error.code || "",
      });
    }

    if (!authData) {
      throw new SignUpError({
        message: "Failed to create account",
        status: 500,
      });
    }

    const user = authData.user as AuthUserRecord;

    await ActivityService.record({
      type: ActivityTypes.SIGNUP,
      actorId: user.id,
      actorType: "user",
      status: "succeeded",
      resourceType: "user",
      resourceId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      description: "User signup completed successfully",
      metadata: {
        email: input.email,
      },
    });

    return authData;
  },
});

export const signIn = createValidatedAction({
  metadata: {
    name: "auth:sign-in",
    description: "Sign in to user account",
    revalidatePaths: ["/auth/signin"],
    formFields: ["password"],
    requireAuth: false,
  },
  schema: signInSchema,
  execute: async ({ input, context }) => {
    const { data: authData, error } = await authClient.signIn.email({
      email: input.email.toLowerCase(),
      password: input.password,
    });

    if (error) {
      const details: Record<string, string[]> = {};

      // Handle common sign-in errors
      if (error.status === 401) {
        details.password = ["Invalid email or password"];
        throw new SignInError({
          message: "Invalid credentials",
          details,
          status: 401,
        });
      }
      if (error.message?.includes("verify")) {
        details.email = ["Please verify your email first"];
        throw new SignInError({
          message: "Email not verified",
          details,
          status: 403,
        });
      }

      // Fallback for other errors
      throw new Error("AAAAAAAAAAAAAAAAA");
    }

    if (!authData) {
      throw new SignInError({
        message: "Authentication failed",
        status: 500,
      });
    }

    const user = authData.user as AuthUserRecord;

    await ActivityService.record({
      type: ActivityTypes.LOGIN,
      actorId: user.id,
      actorType: "user",
      actorRole: user.role,
      status: "succeeded",
      resourceType: "user",
      resourceId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      description: "User signed in successfully",
    });

    return authData;
  },
});
