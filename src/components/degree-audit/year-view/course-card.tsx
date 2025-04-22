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
    "relative flex flex-col rounded-md border p-2 shadow-sm transition-colors",
    {
      // Failed course
      "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800":
        course.status === "failed",
      // Passed course
      "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800":
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
      className={cardBackground}
    >
      {/* Course header with code and actions */}
      <div className="mb-0.5 flex items-start justify-between">
        <h5 className="body2-medium truncate">{course.courseCode}</h5>
        <div className="flex items-center gap-1">
          {/* Credits badge */}
          <Badge variant="outline" className="px-1.5 py-0 text-xs font-normal">
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

      {/* Course title */}
      <p className="caption-regular mb-1 truncate text-muted-foreground">
        {course.courseTitle}
      </p>

      {/* Category with colored dot */}
      <div className="mb-1 flex items-center gap-1">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: course.category.color }}
        ></span>
        <span className="caption-regular">{course.category.name}</span>
      </div>

      {/* Status indicator */}
      <div className="mt-auto">
        {course.status === "completed" && (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-500 dark:bg-green-500 dark:text-tcol-100"
          >
            {course.grade}
          </Badge>
        )}

        {course.status === "failed" && (
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className="bg-red-50 text-red-500 dark:bg-red-500 dark:text-tcol-100"
            >
              {course.grade}
            </Badge>
            <span className="caption-regular text-muted-foreground">
              Min {course.minGradeRequired}
            </span>
          </div>
        )}

        {/*{course.status === "enrolled" && (*/}
        {/*  <Badge className="bg-primary-50 text-primary-500 dark:bg-primary-500 dark:text-tcol-100">*/}
        {/*    Enrolled*/}
        {/*  </Badge>*/}
        {/*)}*/}

        {course.status === "planned" && (
          <Badge
            variant="outline"
            className="bg-surface-50 border text-tcol-300 dark:bg-transparent dark:text-tcol-100"
          >
            Planned
          </Badge>
        )}
      </div>

      {/* Drag handle for planned courses */}
      {isDraggable && (
        <div
          className="absolute inset-0 cursor-grab"
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
