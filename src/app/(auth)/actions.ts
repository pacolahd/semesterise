// app/(auth)/actions.ts
"use server";

import {
  SignUpInput,
  signUpSchema,
} from "@/drizzle/schema/auth/signin-signup-schema";
import { authClient } from "@/lib/auth-client";

// app/(auth)/actions.ts

export async function signUp(formData: SignUpInput) {
  try {
    // Validate the input data
    const validatedData = signUpSchema.parse(formData);

    // Call the auth service to sign up the user
    const { data, error } = await authClient.signUp.email({
      email: validatedData.email.toLowerCase(),
      password: validatedData.password,
      name: validatedData.name,
    });
    if (data) {
      return { success: true, data };
    }
    // Handle specific error codes
    // if (error.status === 422) it means the user already exists. there are different relevant error codes we should handle

    return {
      error: ` ${error.status} - ${error.message}`,
    };
  } catch (error) {
    console.error("Sign up error:", error);

    // Return the error in a structured way
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to create account. Please try again.",
    };
  }
}
