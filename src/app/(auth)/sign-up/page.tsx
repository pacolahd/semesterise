"use client";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { AuthFormItem } from "@/components/forms/auth-form-item";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { Form, FormField } from "@/components/ui/form";
import {
  SignUpInput,
  signUpSchema,
} from "@/drizzle/schema/auth/signin-signup-schema";
import { useSignUp } from "@/lib/auth/auth-hooks";

export default function SignUpPage() {
  // Initialize form with React Hook Form
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Use the TanStack Query hook and pass the form for error handling
  const signUpMutation = useSignUp(form);

  // Form submission handler
  async function onSubmit(values: SignUpInput) {
    signUpMutation.mutate(values);
  }

  return (
    <div className="space-y-4">
      <div className="mb-7 space-y-3 text-center">
        <h1 className="h1-medium text-foreground">Create Your Account</h1>
        <p className="body1-regular text-muted-foreground">
          Enter your details to join semesterise
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <AuthFormItem
                label="Full Name"
                field={field}
                placeholder="John Doe"
              />
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <AuthFormItem
                label="Email"
                field={field}
                placeholder="you@ashesi.edu.gh"
                type="email"
              />
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <AuthFormItem label="Password" field={field} type="password" />
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
              />
            )}
          />

          <FormSubmitButton
            className="body2-medium mt-5 flex h-[58px] w-full justify-self-center rounded-[50px] p-3"
            defaultText="Sign Up"
            pendingText="Creating account..."
            isSubmitting={signUpMutation.isPending}
          />
        </form>
      </Form>

      <div className="text-center">
        <p className="body2-regular text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
