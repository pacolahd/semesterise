"use client";

import { Progress } from "@/components/ui/progress";
import { useAcademicPlan } from "@/lib/academic-plan/academic-plan-hooks";
import { YearPlan } from "@/lib/academic-plan/types";
import { useAuthStore } from "@/lib/auth/auth-store";

// Updated import path

import { DragDropProvider } from "./drag-drop-provider";
import { YearColumn } from "./year-column";

// src/components/degree-audit/year-view/year-by-year-plan-view.tsx

interface YearByYearPlanViewProps {
  plan: YearPlan;
}

export function YearByYearPlanView({ plan }: YearByYearPlanViewProps) {
  const { user } = useAuthStore();

  // We get both the plan as a prop and access to the query client via our hooks
  const { refetch, isRefetching } = useAcademicPlan(user?.id);

  // Handle plan refresh
  const handleRefreshPlan = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error("Error refreshing plan:", error);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Progress section */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Degree Progress</h2>
        <div className="mb-1 flex justify-between text-sm">
          <span>{plan.totalCreditsCompleted} credits completed</span>
          <span>{plan.percentageComplete}% complete</span>
        </div>
        <Progress value={plan.percentageComplete} className="h-2" />
        <div className="mt-2 text-xs text-muted-foreground">
          {plan.totalCreditsRemaining} credits remaining to complete your degree
        </div>
      </div>

      {/* Plan grid with drag and drop */}
      <DragDropProvider plan={plan} refreshPlan={handleRefreshPlan}>
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-[900px] gap-4">
            {Object.keys(plan.years).map((yearNum) => (
              <YearColumn
                key={yearNum}
                year={parseInt(yearNum)}
                fall={plan.years[parseInt(yearNum)].fall}
                spring={plan.years[parseInt(yearNum)].spring}
                summer={plan.years[parseInt(yearNum)].summer}
              />
            ))}
          </div>
        </div>
      </DragDropProvider>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>Last updated: {new Date(plan.lastUpdated).toLocaleString()}</div>
        {isRefetching && <div className="text-primary">Refreshing plan...</div>}
      </div>
    </div>
  );
}
