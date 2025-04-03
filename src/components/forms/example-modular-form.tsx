import Link from "next/link";
import React, { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import {
  DefaultValues,
  FieldValues,
  Path,
  SubmitHandler,
  useForm,
} from "react-hook-form";
import { ZodType } from "zod";

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

// Define structure for field configuration
type FieldConfig<T> = {
  value: T;
  label?: string;
  placeholder?: string;
  type?: string;
};

// Enhanced type for defaultValues
type StructuredDefaultValues<T extends FieldValues> = {
  [K in keyof T]: FieldConfig<T[K]>;
};

/**
 * Props for the ExampleModularForm component
 */
type AuthFormProps<T extends FieldValues> = {
  formType: "SIGN_IN" | "SIGN_UP";
  schema: ZodType<T>;
  defaultValues: StructuredDefaultValues<T>;
  onSubmit: (data: T) => Promise<{ success: boolean; error?: string }>;
  redirectPath?: string;
};

/**
 * Authentication form component for sign in and sign up functionality
 */
const ExampleModularForm = <T extends FieldValues>({
  formType,
  schema,
  defaultValues,
  onSubmit,
  redirectPath,
}: AuthFormProps<T>) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordVisibility, setPasswordVisibility] = useState<
    Record<string, boolean>
  >({});

  // Convert structured defaultValues to format expected by useForm
  const formDefaultValues = Object.fromEntries(
    Object.entries(defaultValues).map(([key, config]) => [key, config.value])
  ) as DefaultValues<T>;

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: formDefaultValues,
    mode: "onBlur",
  });

  const handleSubmit: SubmitHandler<T> = async (data) => {
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

  const togglePasswordVisibility = (fieldName: string) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  const oppositeRoute = formType === "SIGN_IN" ? "/sign-up" : "/sign-in";
  const oppositeText = formType === "SIGN_IN" ? "Create one" : "Sign in";
  const oppositePrompt =
    formType === "SIGN_IN"
      ? "Don't have an account?"
      : "Already have an account?";

  return (
    <div className="w-full max-w-md rounded-lg bg-card p-8 shadow-md">
      <h2 className="h2-bold mb-6 text-center text-primary-500">
        {formType === "SIGN_IN" ? "Welcome Back" : "Create Your Account"}
      </h2>

      {error && (
        <div
          className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
          aria-label={formType === "SIGN_IN" ? "Sign in form" : "Sign up form"}
        >
          {Object.entries(defaultValues).map(([fieldName, config]) => {
            const name = fieldName as Path<T>;
            const fieldType =
              config.type ||
              (fieldName === "email"
                ? "email"
                : fieldName.includes("password")
                  ? "password"
                  : "text");

            // Special case for checkbox fields (like rememberMe)
            if (fieldType === "checkbox") {
              return (
                <div
                  key={fieldName}
                  className="flex items-center justify-between"
                >
                  <FormField
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            id={fieldName}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <label
                          htmlFor={fieldName}
                          className="cursor-pointer text-sm text-muted-foreground"
                        >
                          {config.label || fieldName}
                        </label>
                      </FormItem>
                    )}
                  />

                  {formType === "SIGN_IN" && fieldName === "rememberMe" && (
                    <Link
                      href="/forgot-password"
                      className="text-sm text-primary-500 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
              );
            }

            // Password field with visibility toggle
            if (fieldType === "password") {
              const isVisible = passwordVisibility[fieldName] || false;

              return (
                <FormField
                  key={fieldName}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className="flex w-full flex-col gap-2">
                      <FormLabel className="body2-medium text-tcol-500">
                        {config.label ||
                          (fieldName === "confirmPassword"
                            ? "Confirm Password"
                            : "Password")}
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={isVisible ? "text" : "password"}
                            placeholder={config.placeholder || "••••••••"}
                            {...field}
                            className="pr-10"
                            aria-describedby={`${fieldName}-description`}
                          />
                        </FormControl>
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          onClick={() => togglePasswordVisibility(fieldName)}
                          aria-label={
                            isVisible ? "Hide password" : "Show password"
                          }
                          tabIndex={-1}
                        >
                          {isVisible ? (
                            <EyeOff size={18} className="text-tcol-300" />
                          ) : (
                            <Eye size={18} className="text-tcol-300" />
                          )}
                        </button>
                      </div>
                      <FormMessage id={`${fieldName}-description`} />
                    </FormItem>
                  )}
                />
              );
            }

            // Standard text/email input field
            return (
              <FormField
                key={fieldName}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem className="flex w-full flex-col gap-2">
                    <FormLabel className="body2-medium text-tcol-500">
                      {config.label ||
                        fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type={fieldType}
                        placeholder={
                          config.placeholder || `Enter your ${fieldName}`
                        }
                        {...field}
                        aria-required="true"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}

          <Button
            type="submit"
            className="w-full bg-primary-500 hover:bg-primary-600"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting
              ? formType === "SIGN_IN"
                ? "Signing In..."
                : "Creating Account..."
              : formType === "SIGN_IN"
                ? "Sign In"
                : "Create Account"}
          </Button>

          <div className="mt-4 text-center text-sm text-tcol-400">
            <p>
              {oppositePrompt}{" "}
              <Link
                href={redirectPath || oppositeRoute}
                className="text-primary-500 hover:underline"
              >
                {oppositeText}
              </Link>
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ExampleModularForm;
