// app/(auth)/sign-in/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthFormItem } from "@/components/forms/auth-form-item";
import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { Form, FormField } from "@/components/ui/form";
import {
  SignInInput,
  signInSchema,
} from "@/drizzle/schema/auth/signin-signup-schema";
import { authClient } from "@/lib/auth/auth-client";

import { signIn } from "../actions";

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

// app/(auth)/sign-in/page.tsx

export default function SignInPage() {
  const router = useRouter();
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: SignInInput) {
    try {
      const result = await signIn(values);

      if (!result.success) {
        // Handle field-specific validation errors
        if (result.error?.details) {
          Object.entries(result.error.details).forEach(([field, messages]) => {
            form.setError(field as keyof SignInInput, {
              type: "server",
              message: messages.join(", "),
            });
          });
        } else {
          // Show general error toast
          toast.error(
            result.error?.message || "Sign in failed. Please try again."
          );
        }
        return;
      }
      // Success case
      form.reset();

      toast.success(`Welcome back! ${result?.data?.user?.name?.split(" ")[0]}`);

      const session = await authClient.getSession();

      if (session) {
        toast.success("Session found");
      } else {
        toast.error("Session not found");
      }
      router.refresh();
      router.push("/");
      // Force a hard navigation to homepage
      // window.location.href = "/";
    } catch (error) {
      toast.error("Something went wrong. Check your internet connection");
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-7 space-y-3 text-center">
        <h1 className="h1-medium text-foreground">Welcome Back!</h1>
        <p className="body1-regular text-muted-foreground">Please log in</p>
      </div>

      {/*
        The Form component from shadcn/ui internally provides the FormProvider context,
        which allows the FormSubmitButton to access formState.isSubmitting without
        explicitly wrapping our form in FormProvider.
      */}
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
                forgotPassword={
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

          <div className="flex items-center">
            <label className="body2-regular flex cursor-pointer items-center gap-1.5 text-muted-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-border bg-white focus:ring-primary "
              />
              Remember me
            </label>
          </div>

          <FormSubmitButton
            defaultText="Login"
            pendingText="Logging in..."
            className="body2-medium flex size-full justify-self-center rounded-[50px] p-3"
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
