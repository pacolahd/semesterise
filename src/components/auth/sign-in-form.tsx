"use client";

import Link from "next/link";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// Define validation schema for sign-in
const signInSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .endsWith("ashesi.edu.gh", {
      message: "Please use your Ashesi email address",
    }),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().default(false),
});

// Type inference from the schema
export type SignInFormValues = z.infer<typeof signInSchema>;

/**
 * Props for the SignInForm component
 */
type SignInFormProps = {
  onSubmit: (
    data: SignInFormValues
  ) => Promise<{ success: boolean; error?: string }>;
};

/**
 * Sign-in form component with email, password, and remember me fields
 */
const SignInForm = ({ onSubmit }: SignInFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    mode: "onBlur",
  });

  const handleSubmit = async (data: SignInFormValues) => {
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
        <h2 className="h2-bold mb-2 text-tcol-500">Welcome!</h2>
        <p className="body2-regular text-tcol-300">Please log in</p>
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
          aria-label="Sign in form"
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
                      placeholder="Password"
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

          {/* Remember Me */}
          <div className="flex items-center">
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      id="rememberMe"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="size-4 rounded border-muted-foreground text-primary"
                    />
                  </FormControl>
                  <label
                    htmlFor="rememberMe"
                    className="body3-regular cursor-pointer text-tcol-400"
                  >
                    Remember me
                  </label>
                </FormItem>
              )}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="h-12 w-full rounded-md bg-primary font-medium text-primary-foreground hover:bg-primary-600"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </Button>

          {/* Switch to Sign Up */}
          <div className="mt-6 text-center">
            <p className="body3-regular text-tcol-400">
              Don't have an account?{" "}
              <Link
                href="/sign-up"
                className="body3-medium text-primary-500 hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>

          {/* Forgot Password */}
          <div className="mt-2 text-center">
            <Link
              href="/forgot-password"
              className="body3-medium text-primary-500 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default SignInForm;
