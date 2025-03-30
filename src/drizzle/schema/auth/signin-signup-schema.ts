import { object, string, z } from "zod";

const getPasswordSchema = () =>
  string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password cannot exceed 32 characters");
const getConfirmPasswordSchema = () =>
  string({ required_error: "Password confirmation is required" })
    .min(1, "Please confirm your password")
    .max(32, "Confirmation cannot exceed 32 characters");

const getEmailSchema = () =>
  string({ required_error: "Email is required" })
    .min(1, "Email is required")
    .email("Invalid email")
    .endsWith("ashesi.edu.gh", {
      message:
        "Please use your Ashesi email address (ending with ashesi.edu.gh)",
    });

const getNameSchema = () =>
  string({ required_error: "Name is required" })
    .min(1, "Name is required")
    .min(5, "Name is too short. It must be at least 5 characters")
    .max(50, "Name must be less than 50 characters")
    .refine(
      (value) => {
        // Split by spaces and filter out empty strings
        const names = value.split(" ").filter((part) => part.trim().length > 0);
        return names.length >= 2;
      },
      { message: "Please enter at least first and last name" }
    );

export const signUpSchema = object({
  name: getNameSchema(),
  email: getEmailSchema(),
  password: getPasswordSchema(),
  confirmPassword: getConfirmPasswordSchema(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = object({
  email: getEmailSchema(),
  password: getPasswordSchema(),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = object({
  email: getEmailSchema(),
});

export const resetPasswordSchema = object({
  password: getPasswordSchema(),
  confirmPassword: getConfirmPasswordSchema(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
