"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Sparkles, X } from "lucide-react";

import { AutoPlanButton } from "@/components/degree-audit/year-view/auto-plan-button";
import { YearByYearPlanView } from "@/components/degree-audit/year-view/year-by-year-plan-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { getStudentRemainingRequirements } from "@/lib/academic-plan/academic-plan-actions";
import {
  useAcademicPlan,
  useGenerateAutomaticPlan,
  useRemainingRequirements,
} from "@/lib/academic-plan/academic-plan-hooks";
import { useAuthStore } from "@/lib/auth/auth-store";
import { handleActionResponse } from "@/lib/errors/action-response-handler";

export default function DegreeAuditPage() {
  const { user } = useAuthStore();
  const [showRemainingCourses, setShowRemainingCourses] = useState(false);

  // Get academic plan data
  const {
    plan,
    isLoading: isPlanLoading,
    isError: isPlanError,
    error: planError,
    refetch: refetchPlan,
    isRefetching: isRefetchingPlan,
  } = useAcademicPlan(user?.id);

  // Get remaining requirements data
  const {
    data: remainingRequirements,
    isLoading: isRequirementsLoading,
    refetch: refetchRequirements,
    isRefetching: isRefetchingRequirements,
  } = useRemainingRequirements(user?.id);

  // Auto-plan mutation
  const generatePlanMutation = useGenerateAutomaticPlan();

  const isLoading = isPlanLoading || isRequirementsLoading;
  const isError = isPlanError;

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
          {planError instanceof Error
            ? planError.message
            : "Failed to load your academic plan"}
        </p>
        <Button
          onClick={() => {
            refetchPlan();
            refetchRequirements();
          }}
          className="mt-4"
          disabled={isRefetchingPlan || isRefetchingRequirements}
        >
          {isRefetchingPlan || isRefetchingRequirements ? (
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
            onClick={() => {
              refetchPlan();
              refetchRequirements();
            }}
            variant="outline"
            className="mt-4"
            disabled={isRefetchingPlan || isRefetchingRequirements}
          >
            {isRefetchingPlan || isRefetchingRequirements
              ? "Checking..."
              : "Check Again"}
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
    <div className="space-y-4">
      {/* Minimal progress indicator and key info */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2 max-w-[90vw]">
          <div className="flex gap-4 items-center">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Degree Progress: {plan.percentageComplete}%
                </span>

                {(remainingRequirements?.retakesNeeded ?? 0) > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-amber-100 text-amber-800 border-amber-200"
                  >
                    {remainingRequirements?.retakesNeeded ?? 0} retakes needed
                  </Badge>
                )}
              </div>
              <div className="mt-2">
                <Progress value={plan.percentageComplete} className="h-1.5" />
              </div>
            </div>

            <div className="text-sm text-muted-foreground font-bold flex flex-col items-center justify-center">
              <span>
                {plan.totalCreditsCompleted}/
                {plan.totalCreditsCompleted + plan.totalCreditsRemaining}{" "}
                credits
              </span>

              {remainingRequirements && (
                <Button
                  size="sm"
                  onClick={() => setShowRemainingCourses(true)}
                  className="h-6 text-xs mx-2"
                >
                  {remainingRequirements.totalRequirements}
                  {remainingRequirements.totalRequirements > 1
                    ? " courses "
                    : " course "}
                  left
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:mr-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchPlan();
                refetchRequirements();
              }}
              disabled={isRefetchingPlan || isRefetchingRequirements}
              className="h-8"
            >
              {isRefetchingPlan || isRefetchingRequirements ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Refreshing...
                </>
              ) : (
                "Refresh Plan"
              )}
            </Button>
            <AutoPlanButton />
          </div>
        </div>
      </div>

      {/* Main year-by-year view - taking up most of the space */}
      <YearByYearPlanView plan={plan} />

      {/* Remaining courses dialog (hidden by default) */}
      <Dialog
        open={showRemainingCourses}
        onOpenChange={setShowRemainingCourses}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <div>Remaining Requirements</div>
            </DialogTitle>
          </DialogHeader>

          {isRequirementsLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="border rounded p-3 text-center">
                  <div className="text-sm text-muted-foreground">
                    Total Courses
                  </div>
                  <div className="text-2xl font-semibold">
                    {remainingRequirements?.totalRequirements || 0}
                  </div>
                </div>
                <div className="border rounded p-3 text-center">
                  <div className="text-sm text-muted-foreground">
                    Total Credits
                  </div>
                  <div className="text-2xl font-semibold">
                    {remainingRequirements?.totalCredits || 0}
                  </div>
                </div>
                <div className="border rounded p-3 text-center">
                  <div className="text-sm text-muted-foreground">
                    Retakes Needed
                  </div>
                  <div className="text-2xl font-semibold">
                    {remainingRequirements?.retakesNeeded || 0}
                  </div>
                </div>
              </div>

              {/* Course lists by category */}
              <div className="space-y-3">
                {Object.entries(remainingRequirements?.categories || {}).map(
                  ([key, category]) => (
                    <div key={key} className="border rounded overflow-hidden">
                      <div className="bg-muted/30 p-2 flex justify-between items-center border-b">
                        <h3 className="font-medium">{category.name}</h3>
                        <span className="text-sm">
                          {category.remainingCredits} credits
                        </span>
                      </div>
                      <div className="divide-y">
                        {remainingRequirements?.allRequirements
                          .filter((req) => req.parentCategory === category.name)
                          .map((req, index) => (
                            <div
                              key={`${req.courseCode || "elective"}-${index}`}
                              className={`p-2 text-sm flex justify-between ${req.isRetake ? "bg-amber-50 dark:bg-amber-900/10" : ""}`}
                            >
                              <div>
                                <div className="font-medium">
                                  {req.courseCode || req.courseTitle}
                                  {req.isRetake && (
                                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                      Retake
                                    </span>
                                  )}
                                </div>
                                {req.courseCode && (
                                  <div className="text-xs text-muted-foreground">
                                    {req.courseTitle}
                                  </div>
                                )}
                              </div>
                              <div className="text-right whitespace-nowrap">
                                <div>{req.credits} credits</div>
                                {req.recommendedYear && (
                                  <div className="text-xs text-muted-foreground">
                                    Year {req.recommendedYear}/
                                    {getSemesterName(
                                      req.recommendedSemester || 1
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button onClick={() => setShowRemainingCourses(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to get semester name
function getSemesterName(semester: number): string {
  switch (semester) {
    case 1:
      return "Fall";
    case 2:
      return "Spring";
    case 3:
      return "Summer";
    default:
      return "Unknown";
  }
}
