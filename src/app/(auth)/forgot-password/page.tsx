"use client";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { AuthFormItem } from "@/components/forms/auth-form-item";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { Form, FormField } from "@/components/ui/form";
import {
  ForgotPasswordInput,
  forgotPasswordSchema,
} from "@/drizzle/schema/auth/signin-signup-schema";
import { useForgotPassword } from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  // Initialize form with React Hook Form
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Use the TanStack Query hook and pass the form for error handling
  const forgotPasswordMutation = useForgotPassword(form);

  // Form submission handler
  async function onSubmit(values: ForgotPasswordInput) {
    forgotPasswordMutation.mutate(values);
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
            isSubmitting={forgotPasswordMutation.isPending}
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
