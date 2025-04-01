// app/(auth)/sign-in/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  SignInInput,
  signInSchema,
} from "@/drizzle/schema/auth/signin-signup-schema";

import { signIn, signUp } from "../actions";

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

export default function SignUpPage() {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: SignInInput) {
    try {
      setIsPending(true);
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
            `${result.error?.message} ` ||
              "Details - User already exists 422 SIGNUP_ERROR undefined"
          );
        }
        return;
      }

      // Success case
      toast.success(
        "Account created! Please check your email to verify your account."
      );
      // router.push("/sign-in");
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>
          Log in to your account to access our dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@ashesi.edu.gh" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center text-sm">
          Don&#39;t have an account?{" "}
          <Link href="/sign-up" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
