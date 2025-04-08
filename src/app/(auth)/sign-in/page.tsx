"use client";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { AuthFormItem } from "@/components/forms/auth-form-item";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  SignInInput,
  signInSchema,
} from "@/drizzle/schema/auth/signin-signup-schema";
import { useSignIn } from "@/lib/auth/auth-hooks";

export default function SignInPage() {
  // Initialize form with React Hook Form
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  // Use the TanStack Query hook and pass the form for error handling
  const signInMutation = useSignIn(form);

  // Form submission handler
  async function onSubmit(values: SignInInput) {
    signInMutation.mutate(values);
  }

  return (
    <div className="space-y-4">
      <div className="mb-7 space-y-3 text-center">
        <h1 className="h1-medium text-foreground">Welcome Back!</h1>
        <p className="body1-regular text-muted-foreground">Please log in</p>
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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <AuthFormItem
                label="Password"
                field={field}
                type="password"
                rightSideLabel={
                  <Link
                    href="/forgot-password"
                    className="text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                }
              />
            )}
          />

          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="size-4 rounded border-gray-500"
                  />
                </FormControl>
                <FormLabel className="body2-regular cursor-pointer text-muted-foreground">
                  Remember me
                </FormLabel>
              </FormItem>
            )}
          />

          <FormSubmitButton
            defaultText="Login"
            pendingText="Logging in..."
            className="body2-medium flex size-full justify-self-center rounded-[50px] p-3"
            isSubmitting={signInMutation.isPending}
          />
        </form>
      </Form>

      <div className="text-center">
        <p className="body2-regular text-muted-foreground">
          Don&#39;t have an account?{" "}
          <Link href="/sign-up" className="text-primary hover:underline ">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
