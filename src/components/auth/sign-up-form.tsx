import Link from "next/link";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// Define validation schema for sign-up
const signUpSchema = z
  .object({
    email: z
      .string()
      .email("Please enter a valid email address")
      .endsWith("ashesi.edu.gh", {
        message: "Please use your Ashesi email address",
      }),
    studentId: z
      .string()
      .min(8, "Please enter a valid student ID")
      .max(12, "Please enter a valid student ID"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Type inference from the schema
export type SignUpFormValues = z.infer<typeof signUpSchema>;

/**
 * Props for the SignUpForm component
 */
type SignUpFormProps = {
  onSubmit: (
    data: SignUpFormValues
  ) => Promise<{ success: boolean; error?: string }>;
};

/**
 * Sign-up form component with email, student ID, password, and confirmation fields
 */
const SignUpForm = ({ onSubmit }: SignUpFormProps) => {
  "use client";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      studentId: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const handleSubmit = async (data: SignUpFormValues) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const result = await onSubmit(data);

      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h2 className="h2-bold mb-2 text-tcol-500">Create Account</h2>
        <p className="body2-regular text-tcol-300">
          Please sign up to continue
        </p>
      </div>

      {error && (
        <div
          className="mb-6 rounded-md bg-destructive/10 p-4 text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-5"
          aria-label="Sign up form"
        >
          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="body2-medium text-tcol-500">
                  Student email address
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Student email address"
                    className="h-12 rounded-md border-input bg-background px-4"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-destructive" />
              </FormItem>
            )}
          />

          {/* Student ID Field */}
          <FormField
            control={form.control}
            name="studentId"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="body2-medium text-tcol-500">
                  Student ID
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Your student ID"
                    className="h-12 rounded-md border-input bg-background px-4"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-destructive" />
              </FormItem>
            )}
          />

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="body2-medium text-tcol-500">
                  Password
                </FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      className="h-12 rounded-md border-input bg-background px-4 pr-10"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-tcol-300"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <FormMessage className="text-destructive" />
              </FormItem>
            )}
          />

          {/* Confirm Password Field */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="body2-medium text-tcol-500">
                  Confirm Password
                </FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="h-12 rounded-md border-input bg-background px-4 pr-10"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-tcol-300"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
                <FormMessage className="text-destructive" />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            className="h-12 w-full rounded-md bg-primary font-medium text-primary-foreground hover:bg-primary-600"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Sign Up"}
          </Button>

          {/* Switch to Sign In */}
          <div className="mt-6 text-center">
            <p className="body3-regular text-tcol-400">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="body3-medium text-primary-500 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default SignUpForm;
