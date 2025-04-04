"use client";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthFormItem } from "@/components/forms/auth-form-item";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { Form, FormField } from "@/components/ui/form";
import {
  ForgotPasswordInput,
  forgotPasswordSchema,
} from "@/drizzle/schema/auth/signin-signup-schema";

import { sendPasswordResetEmail } from "../actions";

// app/(auth)/forgot-password/page.tsx

export default function ForgotPasswordPage() {
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    try {
      const result = await sendPasswordResetEmail(values);

      if (!result.success) {
        if (result.error?.details) {
          Object.entries(result.error.details).forEach(([field, messages]) => {
            form.setError(field as keyof ForgotPasswordInput, {
              type: "server",
              message: messages.join(", "),
            });
          });
        } else {
          toast.error(
            result.error?.message || "Password reset failed. Please try again."
          );
        }
        return;
      }

      // Success case
      form.reset();

      toast.success("Password reset email sent! Check your inbox.");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Something went wrong. Check your internet connection");
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-7 space-y-3 text-center">
        <h1 className="h1-medium text-foreground">Forgot Password?</h1>
        <p className="body1-regular text-muted-foreground">
          Enter your Ashesi email and we&#39;ll email you a link to reset your
          password
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <AuthFormItem
                label="Ashesi Email"
                field={field}
                type="email"
                placeholder="you@ashesi.edu.gh"
              />
            )}
          />

          <FormSubmitButton
            defaultText="Send Reset Email"
            pendingText="Sending..."
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
