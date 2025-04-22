// src/components/degree-audit/year-view/course-card.tsx
import { useState } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

import { useDndContext } from "./drag-drop-provider";

interface CourseCardProps {
  course: CourseWithStatus;
  isOverlay?: boolean;
}

export function CourseCard({ course, isOverlay = false }: CourseCardProps) {
  const { removeCourse } = useDndContext();
  const [menuOpen, setMenuOpen] = useState(false);

  // Only enable drag for planned courses
  const isDraggable = course.status === "planned";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: course.id,
    data: {
      course,
      type: "course",
      semester: `${course.year}-${course.semester}`,
    },
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 1 : "auto",
  };

  // Determine background color based on status
  const cardBackground = cn(
    "relative flex flex-col rounded-md border-[0.5px] p-2 shadow-sm transition-colors",
    {
      // Failed course
      "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800":
        course.status === "failed",
      // Passed course
      "bg-green-50 dark:bg-green-950/30  dark:border-green-800":
        course.status === "completed" && !course.retakeNeeded,
      // // Enrolled course
      // "bg-surface-500 dark:bg-card border-primary/30 dark:border-primary/30":
      //   course.status === "enrolled",
      // Planned course
      "bg-surface-500 dark:bg-card border-border": course.status === "planned",
      // When being dragged as overlay
      "cursor-grabbing": isOverlay,
    }
  );

  // Determine status display text and color
  const getStatusDisplay = () => {
    if (course.status === "failed") {
      return (
        <span className=" flex flex-col items-end">
          <div className="w-7 h-7 flex items-center justify-center rounded-full bg-danger-600 text-surface-50 dark:bg-danger-700 text-sm font-medium">
            {course.grade}
          </div>

          <span className="caption-regular ml-1 text-danger-600 dark:text-danger-400 mt-0.5">
            Min {course.minGradeRequired}
          </span>
        </span>
      );
    }

    // if (course.status === "enrolled") {
    //   return (
    //     <div className="flex items-center justify-center rounded-[25px] p-2 bg-primary-50 text-primary-500 dark:text-tcol-100 dark:bg-primary-500 caption-regular">
    //       Enrolled
    //     </div>
    //   );
    // }

    if (course.status === "planned") {
      return (
        <div className="flex items-center justify-center rounded-[25px] p-2 bg-surface-50 dark:bg-transparent text-tcol-300 dark:text-tcol-100 caption-regular border">
          Planned
        </div>
      );
    }

    // meaning the status is completed
    return (
      <div
        className={cn(
          "w-7 h-7 flex items-center justify-around rounded-full bg-green-400 dark:bg-green-500 text-surface-50  caption-regular mr-1",
          course.grade!.length > 1 ? "pl-0.5" : ""
        )}
      >
        {course.grade}
      </div>
    );
  };

  // Determine the course grade colors
  const getGradeDisplay = () => {
    if (course.status === "failed") {
      return "text-danger-600 dark:text-danger-400";
    }

    if (course.status === "completed" && course.retakeNeeded) {
      return "text-warning-600 dark:text-warning-400";
    }

    return (
      <div
        className={cn(
          "w-7 h-7 flex items-center justify-around rounded-full bg-green-400 dark:bg-green-500 text-surface-50  caption-regular",
          course.grade!.length > 1 ? "pl-0.5" : ""
        )}
      >
        {course.grade}
      </div>
    );
  };

  // Handle course actions
  const handleRemove = () => {
    removeCourse(course.id);
    setMenuOpen(false);
  };

  return (
    <div
      ref={isDraggable ? setNodeRef : undefined}
      style={isDraggable ? style : undefined}
      {...(isDraggable ? attributes : {})}
      className={cn(
        cardBackground,
        "transition-all rounded-md",
        course.status === "planned" && "cursor-move"
      )}
    >
      <div className="flex justify-between items-center gap-1">
        <div className="flex-1 min-w-0">
          {/* Course code, credits, info tooltip */}
          <div className="flex items-center mb-1 gap-1">
            <span className="font-semibold text-[15px] truncate">
              {course.courseCode}
            </span>
            <Badge
              variant="outline"
              className="mx-1 text-xs bg-surface-50 dark:bg-transparent text-tcol-300 dark:text-tcol-100 rounded-[25px] px-2.5 py-1
              "
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

          {/* Course title */}
          <p className="text-[14px] font-medium mb-1 text-muted-foreground truncate  ">
            {course.courseTitle}
          </p>

          {/* Category with colored dot */}
          <div className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: course.category.color }}
            ></span>
            <span className="caption-regular">{course.category.name}</span>
          </div>
        </div>

        <div className="flex items-center">
          {getStatusDisplay()}

          {/* Actions menu - only for planned courses */}
          {course.status === "planned" && (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0 text-muted-foreground"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                  <span className="sr-only">Course actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleRemove}>
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
