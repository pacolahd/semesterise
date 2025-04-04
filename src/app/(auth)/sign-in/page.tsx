"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ErrorContext } from "@better-fetch/fetch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { getUserByEmail } from "@/app/(auth)/actions";
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
import { authClient } from "@/lib/auth/auth-client";
import { logClientError } from "@/lib/errors/client/log-client-error";
import { handleAuthError } from "@/lib/errors/errors";

// app/(auth)/sign-in/page.tsx

export default function SignInPage() {
  const router = useRouter();
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  async function onSubmit(values: SignInInput) {
    // first off, check if user exists:
    const userExists = await getUserByEmail(values.email.toLowerCase());

    if (!userExists) {
      // No account with this email
      form.setError("email", {
        type: "server",
        message:
          "Chale! No account was found with this email address. Please correct your email or sign up.",
      });
      return;
    }
    // Continue with sign-in process only for non-existing users
    await authClient.signIn.email(
      {
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      },
      {
        onRequest: () => {
          // Show loading toast?
        },
        onSuccess: async (ctx) => {
          form.reset();
          toast.success(`Welcome back! ${ctx.data.user.name.split(" ")[0]}`);
          router.push("/");
          // router.refresh();
        },
        onError: async (ctx: ErrorContext) => {
          console.error(ctx.error);
          const authError = handleAuthError(ctx.error);
          if (authError?.details) {
            Object.entries(authError.details).forEach(([field, messages]) => {
              form.setError(field as keyof SignInInput, {
                type: "server",
                message: messages.join(", "),
              });
            });
          } else {
            // Show general error toast
            toast.error(
              // eslint-disable-next-line eqeqeq
              authError.message == "Generic"
                ? "Something went wrong. Check your internet connection"
                : authError.message
            );
          }
          await logClientError(ctx.error);
        },
      }
    );
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

          {/* Add Remember me and Forgot password row */}
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
