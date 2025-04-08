"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { AuthFormItem } from "@/components/forms/auth-form-item";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { Form, FormField } from "@/components/ui/form";
import {
  ResetPasswordInput,
  resetPasswordSchema,
} from "@/drizzle/schema/auth/signin-signup-schema";
import { useResetPassword } from "@/lib/auth/auth-hooks";

function ResetPasswordPageContent() {
  // Access query parameters
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token");
  const error = searchParams.get("error");

  // Initialize form with React Hook Form
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      token: resetToken || "",
    },
  });

  // Update token in form when it changes in URL
  useEffect(() => {
    if (resetToken) {
      form.setValue("token", resetToken);
    }
  }, [resetToken, form]);

  // Use the TanStack Query hook and pass the form for error handling
  const resetPasswordMutation = useResetPassword(form);

  // Form submission handler
  async function onSubmit(values: ResetPasswordInput) {
    resetPasswordMutation.mutate(values);
  }

  // Handle invalid token error
  if (error === "INVALID_TOKEN") {
    return (
      <div className="space-y-4">
        <div className="mb-7 space-y-3 ">
          <h1 className="h1-medium text-foreground">Invalid Reset Link</h1>
          <p className="body1-regular text-muted-foreground">
            This password reset link is either expired or invalid
          </p>
        </div>

        <div className="">
          <p className="body2-regular text-muted-foreground">
            Please request a new link from the{" "}
            <Link
              href="/forgot-password"
              className="text-primary hover:underline"
            >
              forgot password page
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-7 space-y-3 text-center">
        <h1 className="h1-medium text-foreground">Reset Password</h1>
        <p className="body1-regular text-muted-foreground">
          Enter your new password below
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <AuthFormItem
                label="New Password"
                field={field}
                type="password"
                placeholder="Enter new password"
              />
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <AuthFormItem
                label="Confirm Password"
                field={field}
                type="password"
                placeholder="Confirm new password"
              />
            )}
          />

          {/* This field is hidden but needed for the form submission */}
          <input type="hidden" {...form.register("token")} />

          <FormSubmitButton
            defaultText="Reset Password"
            pendingText="Resetting..."
            className="body2-medium flex size-full justify-self-center rounded-[50px] p-3"
            isSubmitting={resetPasswordMutation.isPending}
          />
        </form>
      </Form>

      <div className="text-center">
        <p className="body2-regular text-muted-foreground">
          Remember your password?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
