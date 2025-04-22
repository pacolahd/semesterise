"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/drizzle";
import { authUserSchema, authUsers, studentProfiles } from "@/drizzle/schema";
import { AuthUserInput } from "@/drizzle/schema/auth/auth-users";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/drizzle/schema/auth/signin-signup-schema";
import { ServerSession, auth } from "@/lib/auth/auth";
import {
  AppError,
  AuthError,
  ValidationError,
} from "@/lib/errors/app-error-classes";
import {
  convertToAppError,
  serializeError,
} from "@/lib/errors/error-converter";
import { formatZodErrors } from "@/lib/errors/error-converter";
import { ActionResponse } from "@/lib/types/common";

// Check if user exists
export async function checkUserExists(
  email: string
): Promise<ActionResponse<boolean>> {
  try {
    const user = await db.query.authUsers.findFirst({
      where: eq(authUsers.email, email.toLowerCase()),
      columns: { id: true },
    });

    return {
      success: true,
      data: !!user,
    };
  } catch (error) {
    console.error("Error checking user existence:", error);

    // Serialize the error
    const serializedError = serializeError(error);

    return {
      success: false,
      error: serializedError,
    };
  }
}

/**
 * Get student ID for an authenticated user
 * This should be called once during session initialization
 */
export async function getStudentId(
  authId: string
): Promise<ActionResponse<{ studentId: string }>> {
  try {
    // Query the student profile directly using the auth ID
    // This assumes there's a direct relationship between auth users and student profiles
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, authId), // Note: this assumes studentProfiles has a userId column
      columns: {
        studentId: true,
      },
    });

    if (!profile || !profile.studentId) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "No student profile associated with this user account",
            code: "PROFILE_NOT_FOUND",
          })
        ),
      };
    }

    return {
      success: true,
      data: {
        studentId: profile.studentId,
      },
    };
  } catch (error) {
    console.error("Error resolving student ID:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

// Get the current session
export async function getSession(): Promise<ActionResponse<ServerSession>> {
  try {
    // Get headers for proper session detection
    const headersList = await headers();

    // Use auth API to get session securely on server
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const session: ServerSession | null = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      const error = new AuthError({
        message: "No active session. Please sign in/sign up and try again.",
        code: "NO_SESSION",
        source: "auth-api",
      });

      return {
        success: false,
        error: error.serialize(),
      };
    }

    return {
      success: true,
      data: session,
    };
  } catch (error) {
    console.error("Session error:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

// Sign in a user
export async function signIn(
  formData: z.infer<typeof signInSchema>
): Promise<ActionResponse<any>> {
  // Check if user exists (return early if not)
  const existenceCheck = await checkUserExistenceOrReturn(
    formData.email.toLowerCase(),
    {
      shouldExist: true,
      errorMessage:
        "No account found with this email address. Please correct your email or sign up.",
    }
  );
  if (!existenceCheck.success) return existenceCheck;

  // Validate input (return early if invalid)
  const validatedFields = signInSchema.safeParse(formData);
  if (!validatedFields.success) {
    const validationError = new ValidationError(
      "Invalid form data",
      formatZodErrors(validatedFields.error)
    );

    return {
      success: false,
      error: validationError.serialize(),
    };
  }

  const { email, password, rememberMe } = validatedFields.data;

  // try signing in
  try {
    // Use auth API for authentication
    const response = await auth.api.signInEmail({
      body: {
        email: email.toLowerCase(),
        password,
        rememberMe,
      },
    });

    // Revalidate paths that might depend on auth state
    revalidatePath("/");

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

// Sign up a new user
export async function signUp(
  formData: z.infer<typeof signUpSchema>
): Promise<ActionResponse<null | boolean>> {
  // Validate input (return early if invalid)
  const validatedFields = signUpSchema.safeParse(formData);
  if (!validatedFields.success) {
    const validationError = new ValidationError(
      "Invalid form data",
      formatZodErrors(validatedFields.error)
    );

    return {
      success: false,
      error: validationError.serialize(),
    };
  }

  const { name, email, password } = validatedFields.data;

  // Check if user already exists (return early if it does)
  const existenceCheck = await checkUserExistenceOrReturn(email, {
    shouldExist: false,
    errorMessage: "This email address is already in use",
  });

  if (!existenceCheck.success) return existenceCheck;
  // try signing up
  try {
    await auth.api.signUpEmail({
      body: {
        name,
        email: email.toLowerCase(),
        password,
      },
    });

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error("Sign up error:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

// Sign out
export async function signOut(): Promise<ActionResponse<boolean>> {
  try {
    const headersList = await headers();
    await auth.api.signOut({ headers: headersList });

    // Revalidate paths that might depend on auth state
    revalidatePath("/", "layout");

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Sign out error:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

// Forgot password
export async function forgotPassword(
  formData: z.infer<typeof forgotPasswordSchema>
): Promise<ActionResponse<boolean>> {
  // Validate input (return early if invalid)
  const validatedFields = forgotPasswordSchema.safeParse(formData);
  if (!validatedFields.success) {
    const validationError = new ValidationError(
      "Invalid form data",
      formatZodErrors(validatedFields.error)
    );

    return {
      success: false,
      error: validationError.serialize(),
    };
  }

  const { email } = validatedFields.data;

  // Check if user exists (return early if not)
  const existenceCheck = await checkUserExistenceOrReturn(email, {
    shouldExist: true,
    errorMessage:
      "No account found with this email address. Please correct your email or sign up.",
  });

  if (!existenceCheck.success) return existenceCheck;

  try {
    await auth.api.forgetPassword({
      body: {
        email: email.toLowerCase(),
        redirectTo: "/reset-password",
      },
    });

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Forgot password error:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

// Reset password
export async function resetPassword(
  formData: z.infer<typeof resetPasswordSchema>
): Promise<ActionResponse<boolean>> {
  // Validate input (return early if invalid)
  const validatedFields = resetPasswordSchema.safeParse(formData);
  if (!validatedFields.success) {
    const validationError = new ValidationError(
      "Invalid form data",
      formatZodErrors(validatedFields.error)
    );

    return {
      success: false,
      error: validationError.serialize(),
    };
  }

  const { password, token } = validatedFields.data;

  try {
    await auth.api.resetPassword({
      body: {
        token,
        newPassword: password,
      },
    });

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error("Reset password error:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

// Update User Profile
export async function updateUserProfile(
  userId: string,
  updates: Partial<AuthUserInput>
): Promise<ActionResponse<null>> {
  const validated = authUserSchema.safeParse(updates);

  if (!validated.success) {
    return {
      success: false,
      error: {
        name: "ValidationError",
        message: "Invalid update data",
        details: validated.error.flatten().fieldErrors,
      },
    };
  }

  try {
    await db
      .update(authUsers)
      .set(validated.data)
      .where(eq(authUsers.id, userId));

    return { success: true, data: null };
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

type UserExistenceCheckOptions = {
  shouldExist: boolean;
  fieldName?: string;
  errorMessage: string;
};

async function checkUserExistenceOrReturn<T>(
  email: string,
  options: UserExistenceCheckOptions
): Promise<ActionResponse<true>> {
  const { shouldExist, errorMessage, fieldName = "email" } = options;

  const userExistsResult = await checkUserExists(email);
  if (!userExistsResult.success) {
    return userExistsResult as ActionResponse<true>;
  }

  const exists = userExistsResult.data ?? false;
  if (exists !== shouldExist) {
    const validationError = new ValidationError(errorMessage, {
      [fieldName]: [errorMessage],
    });

    return {
      success: false,
      error: validationError.serialize(),
    };
  }

  return { success: true, data: true };
}
