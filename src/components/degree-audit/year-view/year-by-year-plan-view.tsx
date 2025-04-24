"use client";

import { Progress } from "@/components/ui/progress";
import { useAcademicPlan } from "@/lib/academic-plan/academic-plan-hooks";
import { YearPlan } from "@/lib/academic-plan/types";
import { useAuthStore } from "@/lib/auth/auth-store";

import { AutoPlanButton } from "./auto-plan-button";
import { DragDropProvider } from "./drag-drop-provider";
import { YearColumn } from "./year-column";

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
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Degree Progress</h2>
          <AutoPlanButton />
        </div>
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
        <div className="pb-4 overflow-x-visible custom-scrollbar">
          <div className="flex gap-4">
            {Object.keys(plan.years).map((yearNum) => {
              const yearKey = parseInt(yearNum);
              const yearData = plan.years[yearKey];

              return (
                <YearColumn
                  key={yearNum}
                  year={yearKey}
                  fall={yearData.fall}
                  spring={yearData.spring}
                  summer={yearData.summer}
                  currentYear={plan.currentYear}
                  currentSemester={plan.currentSemester}
                />
              );
            })}
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
