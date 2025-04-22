// src/components/degree-audit/year-view/semester-panel.tsx
import { Info, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

  // for each course in the semester, check if any of them has a status of "planned" and if so then isImportedSemester is false
  const importedSemester = courses.every(
    (course) => course.status !== "planned"
  );

  return (
    <div
      className={cn(
        "relative flex h-auto min-h-[12rem] flex-col rounded-2xl border bg-surface-50 dark:bg-background shadow-sm p-1",
        hasCreditWarning && "border-danger-600"
      )}
      id={semesterId}
      data-semester-id={semesterId}
    >
      {/* Header */}
      <div className="mb-2">
        <div className="flex justify-between items-center  px-2 pt-2">
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
          <div className="space-y-2">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-2 text-md text-muted-foreground mb-3">
              No courses added to this semester yet!
            </p>
            <Button
              className="text-md py-5"
              variant="outline"
              size="sm"
              onClick={() => onAddCourse(year, semester)}
            >
              <Plus className="h-4 w-4" />
              Add course
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
