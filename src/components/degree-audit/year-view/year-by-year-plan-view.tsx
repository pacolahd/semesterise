"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  const { refetch, isRefetching } = useAcademicPlan(user?.id);
  // Helpers
  function calculateOriginalMaxYear(plan: YearPlan): number {
    const yearsWithCourses = Object.keys(plan.years)
      .filter((yearNum) => {
        const yearKey = parseInt(yearNum);
        const yearData = plan.years[yearKey];
        return (
          yearData.fall.courses.length > 0 ||
          yearData.spring.courses.length > 0 ||
          (yearData.summer?.courses.length || 0) > 0
        );
      })
      .map((y) => parseInt(y));

    return Math.max(
      4,
      yearsWithCourses.length ? Math.max(...yearsWithCourses) : 4
    );
  }

  function isYearEmpty(yearData: YearPlan["years"][number]): boolean {
    return (
      yearData.fall.courses.length === 0 &&
      yearData.spring.courses.length === 0 &&
      (yearData.summer?.courses.length || 0) === 0
    );
  }
  const [originalMaxYear] = useState(() => calculateOriginalMaxYear(plan));
  const [maxVisibleYear, setMaxVisibleYear] = useState(originalMaxYear);

  const handleAddYear = () => {
    if (maxVisibleYear < 8) setMaxVisibleYear((prev) => prev + 1);
  };

  const handleRemoveYear = (year: number) => {
    if (canRemoveYear(year)) setMaxVisibleYear(year - 1);
  };

  const canRemoveYear = (year: number) => {
    return (
      year > originalMaxYear &&
      year === maxVisibleYear &&
      isYearEmpty(plan.years[year])
    );
  };
  // Handle plan refresh
  const handleRefreshPlan = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error("Error refreshing plan:", error);
    }
  };

  // Get sorted year numbers to display
  const visibleYears = Object.keys(plan.years)
    .map((y) => parseInt(y))
    .filter((y) => y <= maxVisibleYear)
    .sort((a, b) => a - b);

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
            {visibleYears.map((yearKey) => (
              <YearColumn
                key={yearKey}
                year={yearKey}
                fall={plan.years[yearKey].fall}
                spring={plan.years[yearKey].spring}
                summer={plan.years[yearKey].summer}
                currentYear={plan.currentYear}
                currentSemester={plan.currentSemester}
                canAddYear={maxVisibleYear < 8}
                canRemoveYear={canRemoveYear(yearKey)}
                onAddYear={handleAddYear}
                onRemoveYear={() => handleRemoveYear(yearKey)}
                isLastYear={yearKey === maxVisibleYear}
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
