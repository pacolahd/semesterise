// src/components/degree-audit/year-view/semester-panel.tsx
import { useDroppable } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { Info, Lock, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseWithStatus, Semester } from "@/lib/academic-plan/types";
import { cn } from "@/lib/utils";

import { CourseCard } from "./course-card";
import { useDndContext } from "./drag-drop-provider";

interface SemesterPanelProps {
  // Explicitly mark all props with default values
  year?: number;
  semester?: number;
  name?: string;
  isSummer?: boolean;
  courses?: CourseWithStatus[];
  totalCredits?: number;
  hasCreditWarning?: boolean;
  currentYear?: number;
  currentSemester?: number;
}

export function SemesterPanel({
  year = 0,
  semester = 0,
  name = "Semester",
  isSummer = false,
  courses = [],
  totalCredits = 0,
  hasCreditWarning = false,
  currentYear = 1,
  currentSemester = 1,
}: SemesterPanelProps) {
  const { onAddCourse } = useDndContext();
  const semesterId = `${year}-${semester}`;

  // Determine if this is a past semester that shouldn't accept drops
  const isPastSemester =
    year < currentYear || (year === currentYear && semester < currentSemester);

  // Add droppable functionality - disable for past semesters
  const { setNodeRef, isOver, active } = useDroppable({
    id: semesterId,
    data: {
      accepts: ["course"],
    },
    disabled: isPastSemester, // Disable dropping for past semesters
  });

  // Check if semester has any planned courses - if not, it's an imported semester
  const importedSemester = courses.every(
    (course) => course.status !== "planned"
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex h-auto min-h-[12rem] flex-col rounded-2xl border bg-surface-50 dark:bg-background shadow-sm p-1",
        hasCreditWarning && "border-danger-600",
        isPastSemester && "opacity-80", // Style past semesters with reduced opacity
        isOver && !isPastSemester && "border-primary-500 border-2", // Only show highlight when droppable
        !isPastSemester &&
          active &&
          "ring-2 ring-primary-200 dark:ring-primary-800/30" // Subtle indication of valid drop targets
      )}
      id={semesterId}
      data-semester-id={semesterId}
    >
      {/* Locked indicator for past semesters */}
      {isPastSemester && (
        <div
          className="absolute -right-1 -top-1 rounded-full bg-muted p-1 text-muted-foreground"
          title="Past semester - cannot modify"
        >
          <Lock size={14} />
        </div>
      )}

      {/* Header */}
      <div className="mb-2">
        <div className="flex justify-between items-center px-2 pt-2">
          <div>
            <h3 className="body1-medium">{name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "mx-1 body2-regular bg-surface-500 dark:bg-transparent text-tcol-500 dark:text-tcol-100 rounded-[25px] px-[7px] py-[4px]",
                courses.length == 0 && "hidden"
              )}
            >
              {totalCredits} credits
            </Badge>
            {/* Only show add button for current/future semesters */}
            {!isPastSemester && (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 bg-surface-500 dark:bg-transparent text-tcol-500 dark:text-tcol-100 rounded-full",
                  importedSemester && "hidden"
                )}
                onClick={() => onAddCourse(year, semester)}
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add course</span>
              </Button>
            )}
          </div>
        </div>
        {/* Credit warning */}
        {hasCreditWarning && (
          <div className="px-2 flex items-center gap-1">
            <Info className="h-3 w-3 text-danger-700" />
            <p className="text-xs text-danger-700">Credit load warning</p>
          </div>
        )}
      </div>

      {/* Course cards */}
      <div
        className={cn(
          "flex flex-1 flex-col p-2",
          courses.length === 0 && "items-center justify-center"
        )}
      >
        {courses.length > 0 ? (
          <SortableContext
            id={semesterId}
            items={courses.map((course) => course.id)}
          >
            <div className="space-y-2">
              {courses.map((course) => (
                <CourseCard
                  key={`${course.id}-${course.year}-${course.semester}`}
                  course={course}
                />
              ))}
            </div>
          </SortableContext>
        ) : (
          <div className="text-center">
            <p className="mb-2 text-md text-muted-foreground mb-3">
              No courses added to this semester yet!
            </p>
            {!isPastSemester && (
              <Button
                className="text-md py-5"
                variant="outline"
                size="sm"
                onClick={() => onAddCourse(year, semester)}
              >
                <Plus className="h-4 w-4" />
                Add course
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
