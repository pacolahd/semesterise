"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";

import { CategoryCourseCard } from "@/components/degree-audit/category-view/category-course-card";
import { CategoryHeader } from "@/components/degree-audit/category-view/category-header";
import { CategoryProgressBar } from "@/components/degree-audit/category-view/category-progress-bar";
import { useCategoryViewController } from "@/components/degree-audit/category-view/category-view-controller";
import { Button } from "@/components/ui/button";
import { useRemainingRequirements } from "@/lib/academic-plan/academic-plan-hooks";
import { useAuthStore } from "@/lib/auth/auth-store";

export default function CategoryViewPage() {
  const { user } = useAuthStore();
  const { requirementGroups, plan, isLoading, isError, error, refetch } =
    useCategoryViewController(user?.id);
  const [isRefetching, setIsRefetching] = useState(false);

  const handleClick = () => {
    setIsRefetching(true);
    // Simulate a 4-second loading period regardless of the actual refetch time
    const loadingTimeout = setTimeout(() => {
      setIsRefetching(false);
    }, 4000);

    // Call your actual refetch function
    refetch().finally(() => {
      // Clear the forced loading timeout if the actual refetch finishes faster
      clearTimeout(loadingTimeout);
      // Ensure isLoading is false after the actual refetch,
      // in case it takes longer than 4 seconds
      setIsRefetching(false);
    });
  };

  //use effect to refetch

  // State to track expanded/collapsed sections
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});

  // Initialize expanded sections when data is loaded
  if (
    requirementGroups.length > 0 &&
    Object.keys(expandedSections).length === 0
  ) {
    const initialExpandedState: { [key: string]: boolean } = {};

    requirementGroups.forEach((group) => {
      group.categories.forEach((category) => {
        // Convert category name to safe key
        const categoryKey = category.name.toLowerCase().replace(/\s+/g, "-");
        initialExpandedState[categoryKey] = true;
      });
    });

    setExpandedSections(initialExpandedState);
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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
          onClick={() => {
            refetch();
          }}
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!plan || requirementGroups.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <h2 className="mb-2 text-lg font-semibold text-amber-700 dark:text-amber-400">
          No Plan Available
        </h2>
        <p className="text-amber-600 dark:text-amber-300">
          It seems you don't have an academic plan yet. Please import your
          transcript first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold mb-4 gap-4 flex items-center">
        Degree Requirements by Category
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isLoading}
          className="h-8"
        >
          {isRefetching ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Refreshing...
            </>
          ) : (
            "Refresh Plan"
          )}
        </Button>
      </h1>

      {/* Render each requirement group */}
      {requirementGroups.map((group, groupIndex) => (
        <div key={group.name} className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{group.name}</h2>
            <p className="text-muted-foreground">
              {group.completedCredits} of {group.totalCredits} credits accounted
              for ({group.percentage}%)
            </p>
          </div>

          {/* Render categories within the group in a grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 lg:grid-cols-3 gap-4">
            {group.categories.map((category) => {
              const categoryKey = category.name
                .toLowerCase()
                .replace(/\s+/g, "-");

              return (
                <div
                  key={
                    category.subCategory
                      ? `${category.name} (${category.subCategory === "Non-Major Electives" ? "General" : category.subCategory})`
                      : category.name
                  }
                  className="border rounded-lg overflow-hidden"
                >
                  <CategoryHeader
                    title={
                      category.subCategory
                        ? `${category.name} (${category.subCategory === "Non-Major Electives" ? "General" : category.subCategory})`
                        : category.name
                    }
                    credits={`${category.completedCredits}/${category.totalCredits} credits`}
                    percentage={category.percentage}
                    isExpanded={expandedSections[categoryKey] ?? true}
                    onClick={() => toggleSection(categoryKey)}
                  />

                  {expandedSections[categoryKey] && (
                    <div className="p-4 space-y-2 bg-background/50">
                      <CategoryProgressBar
                        completed={category.completed}
                        planned={category.planned}
                        percentage={category.percentage}
                      />

                      {/* Course cards */}
                      <div className="mt-4 space-y-2">
                        {category.courses.map((course) => (
                          <CategoryCourseCard key={course.id} course={course} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
