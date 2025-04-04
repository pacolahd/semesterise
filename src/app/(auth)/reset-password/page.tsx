"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthFormItem } from "@/components/forms/auth-form-item";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { Form, FormField } from "@/components/ui/form";
import {
  ResetPasswordInput,
  resetPasswordSchema,
} from "@/drizzle/schema/auth/signin-signup-schema";

import { resetPassword } from "../actions";

// app/(auth)/reset-password/page.tsx

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token");
  const error = searchParams.get("error");
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      token: "",
    },
  });

  async function onSubmit(values: ResetPasswordInput) {
    try {
      form.setValue("token", resetToken || "");
      const result = await resetPassword(values);

      if (!result.success) {
        if (result.error?.details) {
          Object.entries(result.error.details).forEach(([field, messages]) => {
            form.setError(field as keyof ResetPasswordInput, {
              type: "server",
              message: messages.join(", "),
            });
          });
        } else {
          // console.error(result.error);
          if (result.error?.code?.split(" ").pop() === "INVALID_TOKEN") {
            toast.error("Password reset failed", {
              description:
                "It seems your password reset link is either expired or invalid. Try Again one more time, or Resend Link.",
              action: {
                label: "Resend Link",
                onClick: () => router.push("/forgot-password"),
              },
            });
          } else {
            toast.error(
              result.error?.message ||
                "Password reset failed. Please try again."
            );
          }
        }
        return;
      }

      // Success case
      form.reset();

      toast.success("Password reset successfully!");
      router.push("/sign-in");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Something went wrong. Please try again later.");
    }
  }

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

          <FormSubmitButton
            defaultText="Reset Password"
            pendingText="Resetting..."
            className="body2-medium flex size-full justify-self-center rounded-[50px] p-3"
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
