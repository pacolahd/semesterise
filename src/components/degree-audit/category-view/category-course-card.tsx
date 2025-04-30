import { Info, MoreVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CourseWithStatus } from "@/lib/academic-plan/types";
import { cn } from "@/lib/utils";

interface CategoryCourseCardProps {
  course: CourseWithStatus;
}

export function CategoryCourseCard({ course }: CategoryCourseCardProps) {
  const isPlaceholder = !course.courseCode;

  // Determine background color based on status
  const cardBackground = cn(
    "relative flex flex-row justify-between items-center rounded-md border-[0.5px] p-3 shadow-sm transition-colors",
    {
      // Failed course
      "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800":
        course.status === "failed",
      // Passed course
      "bg-green-50 dark:bg-green-950/30 dark:border-green-800":
        course.status === "completed" && !course.retakeNeeded,
      // Placeholder course
      "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800":
        isPlaceholder,
      // Planned course
      "bg-surface-500 dark:bg-card border-border":
        course.status === "planned" && !isPlaceholder,
    }
  );

  // Determine status display
  const getStatusDisplay = () => {
    if (course.status === "failed") {
      return (
        <div className="flex flex-col items-end">
          <div className="w-7 h-7 flex items-center justify-center rounded-full bg-danger-600 text-surface-50 dark:bg-danger-700 text-sm font-medium">
            {course.grade}
          </div>
          <span className="caption-regular ml-1 text-danger-600 dark:text-danger-400 mt-0.5 text-xs">
            Min {course.minGradeRequired}
          </span>
        </div>
      );
    }

    if (course.status === "planned" || isPlaceholder) {
      return (
        <div className="flex items-center justify-center rounded-[25px] px-2 py-1 bg-surface-50 dark:bg-transparent text-tcol-300 dark:text-tcol-100 caption-regular border text-xs">
          Planned
        </div>
      );
    }

    // For completed courses
    return (
      <div
        className={cn(
          "w-7 h-7 flex items-center justify-around rounded-full bg-green-400 dark:bg-green-500 text-surface-50 caption-regular",
          course.grade!.length > 1 ? "pl-0.5" : ""
        )}
      >
        {course.grade}
      </div>
    );
  };

  return (
    <div className={cardBackground}>
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-[15px]">
              {isPlaceholder ? "Elective" : course.courseCode}
            </span>
            <Badge
              variant="outline"
              className="mx-1 text-xs bg-surface-50 dark:bg-transparent text-tcol-300 dark:text-tcol-100 rounded-[25px] px-2 py-0.5"
            >
              {course.credits} cr
            </Badge>

            {/* Info tooltip */}
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 text-muted-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                    <span className="sr-only">Course info</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" align="start" className="max-w-xs">
                  <p>{course.infoMessage || "Course information"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {/* Semester info */}
          <div className="text-xs text-right text-muted-foreground">
            Year {course.year}, {getSemesterName(course.semester)}
          </div>
        </div>

        <div className="  flex items-center justify-between">
          <p className="truncate text-[14px] text-muted-foreground">
            {" "}
            {course.courseTitle}
          </p>

          <div className="flex items-center gap-2 ml-3">
            {/* Status indicator */}
            {getStatusDisplay()}
          </div>
        </div>

        {/* Category with colored dot */}
        <div className="flex items-center jsutify-between gap-1 mt-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: course.category.color }}
          ></span>
          <span className="text-xs">{course.category.name}</span>
        </div>
      </div>
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
