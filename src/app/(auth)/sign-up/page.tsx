// app/(auth)/sign-up/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
// Import shadcn components
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
import { signUpSchema } from "@/drizzle/schema/auth/signin-signup-schema";

import { signUp } from "../actions";

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

// app/(auth)/sign-up/page.tsx

export default function SignUpPage() {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof signUpSchema>) {
    try {
      setIsPending(true);

      // Call the server action directly
      const result = await signUp(values);

      if (result.error) {
        toast.error("Sign up failed", {
          description: result.error,
        });
        // throw new Error(result.error);
      }
      if (result.success) {
        toast.success("Account created", {
          description: `Your account has been created. Check your email for a verification link, ${result.data}`,
        });
      }

      // router.push("/sign-in?newAccount=true");
    } catch (error) {
      console.error("Sign up error:", error);
      toast.error("Something went wrong", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to create your account. Please try again.",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="h2-bold text-center text-primary ">
            Create Your Account
          </CardTitle>
          <CardDescription className="body2-regular text-center text-muted-foreground">
            Enter your details to join Semesterise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="body2-medium">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
                        className="body2-regular"
                        autoComplete="name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="body2-medium">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@ashesi.edu.gh"
                        className="body2-regular"
                        autoComplete="email"
                        {...field}
                      />
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
                    <FormLabel className="body2-medium">Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Create a secure password"
                        className="body2-regular"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="body2-medium">
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your password"
                        className="body2-regular"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="body2-medium mt-2 h-10 w-full"
                disabled={isPending}
              >
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

          <div className="mt-6 text-center">
            <p className="body3-regular text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="body3-medium text-primary transition-colors hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
