"use client";

import { Loader2 } from "lucide-react";

import { YearByYearPlanView } from "@/components/degree-audit/year-view/year-by-year-plan-view";
import { Button } from "@/components/ui/button";
import { useAcademicPlan } from "@/lib/academic-plan/academic-plan-hooks";
import { useAuthStore } from "@/lib/auth/auth-store";

// src/app/(dashboard)/student/degree-audit/page.tsx

export default function DegreeAuditPage() {
  const { user } = useAuthStore();

  // Use the React Query hook instead of manual fetching
  const { plan, isLoading, isError, error, refetch, isRefetching } =
    useAcademicPlan(user?.id);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading your academic plan...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
        <h2 className="mb-2 text-lg font-semibold text-red-700 dark:text-red-400">
          Error Loading Plan
        </h2>
        <p className="text-red-600 dark:text-red-300">
          {error instanceof Error
            ? error.message
            : "Failed to load your academic plan"}
        </p>
        <Button
          onClick={() => refetch()}
          className="mt-4"
          disabled={isRefetching}
        >
          {isRefetching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            "Try Again"
          )}
        </Button>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <h2 className="mb-2 text-lg font-semibold text-amber-700 dark:text-amber-400">
          No Plan Available
        </h2>
        <p className="text-amber-600 dark:text-amber-300">
          Chale it seems you don't have an academic plan yet. Please Import your
          transcript again.
        </p>
        {user?.id && (
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="mt-4"
            disabled={isRefetching}
          >
            {isRefetching ? "Checking..." : "Check Again"}
          </Button>
        )}
        {!user?.id && (
          <p className="mt-4 text-sm text-amber-600">
            No session found. Please log out and log in again.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Year by Year Planning</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          {isRefetching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            "Refresh Plan"
          )}
        </Button>
      </div>
      <YearByYearPlanView plan={plan} />
    </div>
  );
}
