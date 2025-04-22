// src/components/degree-audit/year-view/semester-panel.tsx
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Semester } from "@/lib/academic-plan/types";
import { cn } from "@/lib/utils";

import { CourseCard } from "./course-card";
import { useDndContext } from "./drag-drop-provider";

interface SemesterPanelProps extends Semester {}

export function SemesterPanel({
  year,
  semester,
  name,
  isSummer,
  courses,
  totalCredits,
  hasCreditWarning,
}: SemesterPanelProps) {
  const { onAddCourse, semesterIds } = useDndContext();
  const semesterId = `${year}-${semester}`;

  return (
    <div
      className={cn(
        "relative flex h-auto min-h-[12rem] flex-col rounded-lg border bg-card shadow-sm",
        hasCreditWarning && "border-danger-600"
      )}
      id={semesterId}
      data-semester-id={semesterId}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b p-2">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{name}</h4>
          {!isSummer && totalCredits > 0 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {totalCredits} credits
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 rounded-full p-0"
          onClick={() => onAddCourse(year, semester)}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add course</span>
        </Button>
      </div>

      {/* Credit warning */}
      {hasCreditWarning && (
        <div className="px-2 py-1 text-xs text-danger-600">
          Credit load warning
        </div>
      )}

      {/* Course cards */}
      <div
        className={cn(
          "flex flex-1 flex-col p-2",
          courses.length === 0 && "items-center justify-center"
        )}
      >
        {courses.length > 0 ? (
          <div className="space-y-2">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-2 text-xs text-muted-foreground">
              No courses added to this semester yet!
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddCourse(year, semester)}
            >
              Add course
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
