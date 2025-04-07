"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ServerSessionResult } from "@/lib/auth/auth";
import { authClient } from "@/lib/auth/auth-client";

// src/app/(auth)/email-verified/page.tsx

type RoleInfo = {
  title: string;
  description: string;
  capabilities: string[];
  nextActionText: string;
  nextActionLink: string;
};

const roleInfoMap: Record<string, RoleInfo> = {
  student: {
    title: "Welcome, Student!",
    description:
      "We've verified your Ashesi student account. Semesterise will help you plan your academic journey and stay on track for graduation.",
    capabilities: [
      "Track your degree progress and requirements",
      "Plan future semesters with course recommendations",
      "Submit and track academic petitions",
      "Visualize your Canvas performance data",
    ],
    nextActionText: "Complete Your Profile Setup",
    nextActionLink: "/onboarding/student",
  },
  academic_advisor: {
    title: "Welcome, Academic Advisor!",
    description:
      "Your account has been verified. You can now help student with their academic journey.",
    capabilities: [
      "Review and approve student petitions",
      "View student academic progress",
      "Access degree audit reports",
      "Provide academic guidance",
    ],
    nextActionText: "Go to Dashboard",
    nextActionLink: "/dashboard",
  },
  hod: {
    title: "Welcome, Department Head!",
    description:
      "Your account has been verified. You can now manage department-related academic matters.",
    capabilities: [
      "Review and approve department-related petitions",
      "Monitor student progress in your department",
      "Oversee course prerequisites and requirements",
      "Generate department reports",
    ],
    nextActionText: "Go to Dashboard",
    nextActionLink: "/dashboard",
  },
  provost: {
    title: "Welcome, Provost!",
    description:
      "Your account has been verified. You now have administrative access to the academic system.",
    capabilities: [
      "Final approval on academic petitions",
      "View academic performance across departments",
      "Access comprehensive reports",
      "Oversee academic policies",
    ],
    nextActionText: "Go to Dashboard",
    nextActionLink: "/dashboard",
  },
  registry: {
    title: "Welcome, Registry Staff!",
    description:
      "Your account has been verified. You can now manage student records and academic processes.",
    capabilities: [
      "Process approved petitions",
      "Manage student records",
      "Oversee degree audits",
      "Generate academic reports",
    ],
    nextActionText: "Go to Dashboard",
    nextActionLink: "/dashboard",
  },
  // Default case if role is unrecognized
  default: {
    title: "Email Verified Successfully!",
    description:
      "Your account has been verified. You can now access Semesterise.",
    capabilities: [
      "Explore the platform",
      "Complete your profile setup",
      "Access available features",
    ],
    nextActionText: "Continue to Dashboard",
    nextActionLink: "/dashboard",
  },
};

export default function EmailVerifiedPage() {
  const [userInfo, setUserInfo] = useState<{
    name: string;
    role: string;
    isLoading: boolean;
  }>({
    name: "",
    role: "",
    isLoading: true,
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const result: ServerSessionResult = await authClient.getSession();

        if (result.error || !result.data?.user) {
          // If no session, redirect to login
          toast.error("Session expired. Please log in again.");
          setTimeout(() => redirect("/sign-in"), 2000);
          return;
        }

        setUserInfo({
          name: result.data.user.name || "",
          role: result.data.user.role || "default",
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to get session:", error);
        toast.error("Something went wrong. Please try again.");
        setUserInfo((prev) => ({ ...prev, isLoading: false }));
      }
    };

    checkSession();
  }, []);

  const roleInfo = userInfo.role
    ? roleInfoMap[userInfo.role] || roleInfoMap.default
    : roleInfoMap.default;

  if (userInfo.isLoading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="mt-2 h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-40" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <Check className="size-6 text-green-600 dark:text-green-50" />
          </div>
          <CardTitle className="text-2xl font-bold">{roleInfo.title}</CardTitle>
          <CardDescription className="mt-2 text-lg">
            {userInfo.name ? `Hello ${userInfo.name.split(" ")[0]}, ` : ""}
            {roleInfo.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">
              What you can do with Semesterise:
            </h3>
            <ul className="space-y-2">
              {roleInfo.capabilities.map((capability, index) => (
                <li key={index} className="flex items-start">
                  <div className="mr-2 mt-1 flex size-4 items-center justify-center rounded-full bg-primary-50">
                    <Check className="size-3 text-primary" />
                  </div>
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button asChild className="flex items-center gap-2" variant="default">
            <Link href={roleInfo.nextActionLink}>
              {roleInfo.nextActionText}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go to Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
