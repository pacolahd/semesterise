"use server";

import { eq } from "drizzle-orm";

import { db } from "@/drizzle";
import { authUsers } from "@/drizzle/schema";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/drizzle/schema/auth/signin-signup-schema";
import { authClient } from "@/lib/auth/auth-client";
import {
  ForgotPasswordError,
  ResetPasswordError,
  SignUpError,
  handleAuthError,
} from "@/lib/errors/errors";
import { createValidatedAction } from "@/lib/server-action-wrapper";

export const signUp = createValidatedAction({
  metadata: {
    name: "auth:sign-up",
    description: "Register a new user account",
    revalidatePaths: ["/sign-up"],
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

// export const signIn = createValidatedAction({
//   metadata: {
//     name: "auth:sign-in",
//     description: "Sign in to user account",
//     revalidatePaths: ["/sign-in"],
//     sensitiveFields: ["password"],
//     requireAuth: false,
//   },
//   schema: signInSchema,
//   execute: async ({ input }) => {
//     try {
//       return await auth.api.signInEmail({
//         body: { email: input.email.toLowerCase(), password: input.password },
//       });
//     } catch (error) {
//       console.error("Sign In error:", error);
//       const authError = handleAuthError(error);
//       throw new SignInError({
//         message:
//           // eslint-disable-next-line eqeqeq
//           authError.message != "Generic"
//             ? authError.message
//             : "Sign in failed. Please try again.",
//         details: authError.details,
//         status: authError.status,
//         code: authError.code,
//       });
//     }
//   },
// });

export const sendPasswordResetEmail = createValidatedAction({
  metadata: {
    name: "auth:forget-password",
    description: "Forget password",
    // revalidatePaths: ["/auth/signin"],
    sensitiveFields: ["password"],
    requireAuth: false,
  },
  schema: forgotPasswordSchema,
  execute: async ({ input }) => {
    // check if email is already registered
    const userEmail = input.email.toLowerCase();
    const existingUser = await db.query.authUsers.findFirst({
      where: eq(authUsers.email, userEmail),
      columns: { id: true },
    });

    if (!existingUser) {
      throw new ForgotPasswordError({
        message: "No account found with this email address.",
        details: {
          email: [
            "No account found with this email address. Correct the email and try again.",
          ],
        },
        status: 404,
        code: "USER_NOT_FOUND",
      });
    }

    const { error } = await authClient.forgetPassword({
      email: userEmail,
      redirectTo: "/reset-password",
    });

    if (error) {
      console.error("Forgot Password Error:", error);
      const authError = handleAuthError(error);
      throw new ForgotPasswordError({
        message:
          // eslint-disable-next-line eqeqeq
          authError.message != "Generic"
            ? authError.message
            : "Failed to send reset password link. Please try again.",
        details: authError.details,
        status: authError.status,
        code: authError.code,
      });
    }
  },
});

export const resetPassword = createValidatedAction({
  metadata: {
    name: "auth:reset-password",
    description: "Reset password",
    // revalidatePaths: ["/auth/signin"],
    sensitiveFields: ["password", "confirmPassword"],
    requireAuth: false,
  },
  schema: resetPasswordSchema,
  execute: async ({ input }) => {
    const { data: authData, error } = await authClient.resetPassword({
      newPassword: input.password,
      token: input.token,
    });

    if (error) {
      console.error("Reset Password Error:", error);
      const authError = handleAuthError(error);
      throw new ResetPasswordError({
        message:
          // eslint-disable-next-line eqeqeq
          authError.message != "Generic"
            ? authError.message
            : "Failed to reset password. Please try again.",
        details: authError.details,
        status: authError.status,
        code: authError.code,
      });
    }

    return authData;
  },
});

export const getUserByEmail = async (email: string) => {
  const existingUser = await db.query.authUsers.findFirst({
    where: eq(authUsers.email, email),
    columns: { id: true },
  });

  return !!existingUser;
};
