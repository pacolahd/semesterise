"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ShieldAlert } from "lucide-react";

import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Handle case where user is authenticated after page loads
  useEffect(() => {
    // If user becomes null (logged out), redirect to login
    if (user === null) {
      router.push("/sign-in");
    }
  }, [user, router]);

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <Card className="mx-auto max-w-md border-red-200 shadow-md dark:border-red-800/40">
          <CardHeader className="flex flex-col items-center border-b pb-6">
            <ShieldAlert className="mb-4 h-16 w-16 text-red-500" />
            <CardTitle className="text-center text-2xl font-bold text-red-700 dark:text-red-400">
              Access Denied
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <p className="text-gray-700 dark:text-gray-300">
                You don't have permission to access the requested page.
              </p>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                If you believe this is an error, please contact your
                administrator for assistance.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex justify-center space-x-4 pt-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-gray-300"
            >
              Go Back
            </Button>

            <Button
              onClick={() => router.push("/")}
              className="bg-primary text-white hover:bg-primary/90"
            >
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>

        {/* User Info (Only visible in development) */}
        {process.env.NODE_ENV === "development" && user && (
          <div className="mt-8 max-w-md rounded-md border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-2 font-semibold">Debug Info (Dev Only)</h3>
            <p>
              <strong>User:</strong> {user.name}
            </p>
            <p>
              <strong>Role:</strong> {user.role}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
