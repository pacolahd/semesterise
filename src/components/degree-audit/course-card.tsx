"use client";

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
import { Course, CourseStatus } from "@/lib/degree-audit/types";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  course: Course;
  className?: string;
}

export function CourseCard({ course, className }: CourseCardProps) {
  // Set up sortable functionality for drag and drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: course.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Determine card background color based on status
  const cardBackground = () => {
    if (course.status === "FAILED")
      return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
    if (
      typeof course.status === "string" &&
      course.status.match(/^[A-D](\+|-)?$/)
    )
      return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
    if (course.status === "ENROLLED")
      return "bg-surface-500 dark:bg-card border-primary/30 dark:border-primary/30";
    return "bg-surface-500 dark:bg-card border-border";
  };

  // Determine status display text and color
  const getStatusDisplay = () => {
    if (course.status === "FAILED") {
      return (
        <span className=" flex flex-col items-end">
          <div className="w-7 h-7 flex items-center justify-center rounded-full bg-danger-600 text-surface-50 dark:bg-danger-700 text-sm font-medium">
            {course.grade}
          </div>

          <span className="caption-regular ml-1 text-danger-600 dark:text-danger-400 mt-0.5">
            Min {course.minGrade}
          </span>
        </span>
      );
    }

    if (course.status === "ENROLLED") {
      return (
        <div className="flex items-center justify-center rounded-[25px] p-2 bg-primary-50 text-primary-500 dark:text-tcol-100 dark:bg-primary-500 caption-regular">
          Enrolled
        </div>
      );
    }

    if (course.status === "PLANNED") {
      return (
        <div className="flex items-center justify-center rounded-[25px] p-2 bg-surface-50 dark:bg-transparent text-tcol-300 dark:text-tcol-100 caption-regular border">
          Planned
        </div>
      );
    }

    // For grades (passed courses)
    if (
      typeof course.status === "string" &&
      course.status.match(/^[A-D](\+|-)?$/)
    ) {
      return (
        <div
          className={cn(
            "w-7 h-7 flex items-center justify-around rounded-full bg-green-400 dark:bg-green-500 text-surface-50  caption-regular",
            course.status.length > 1 ? "pl-0.5" : ""
          )}
        >
          {course.status}
        </div>
      );
    }

    return (
      <span className="text-muted-foreground text-sm font-medium">
        {course.status}
      </span>
    );
  };

  // Get dot color for category
  const getCategoryColor = () => {
    const categories: Record<string, string> = {
      "Major required": "bg-red-500",
      "Major elective": "bg-blue-500",
      "Liberal Arts and Science core": "bg-purple-500",
      "Mathematics & Quantitative": "bg-yellow-500",
      "Humanities & Social Sciences": "bg-green-500",
      Computing: "bg-cyan-500",
      Business: "bg-amber-500",
      Science: "bg-emerald-500",
    };

    return categories[course.category] || "bg-gray-500";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative p-2 mb-2 border rounded-md cursor-move transition-all",
        cardBackground(),
        className
      )}
    >
      <div className="flex justify-between items-center gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-1 gap-1">
            <span className="font-semibold text-[15px] truncate">
              {course.code}
            </span>
            <Badge
              variant="outline"
              className="mx-1 text-xs bg-surface-50 dark:bg-transparent text-tcol-300 dark:text-tcol-100 rounded-[25px] px-2.5 py-1.5
              "
            >
              {course.credits} cr
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="sr-only">Course info</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px] text-xs">
                  {course.description || course.title}
                  {course.tooltip && (
                    <p className="mt-1 text-xs font-medium text-foreground">
                      {course.tooltip}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-[14px] text-muted-foreground truncate  ">
            {course.title}
          </p>

          <div className="flex items-center mt-2">
            <span
              className={`inline-block w-2 h-2 rounded-full mr-1.5 ${getCategoryColor()}`}
            ></span>
            <span className="text-xs">{course.category}</span>
          </div>
        </div>

        <div className="flex items-center">
          {getStatusDisplay()}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 text-tcol-800 dark:text-muted-foreground"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuItem>Change category</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Remove course
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Completed tag for passed courses */}
      {/*{typeof course.status === "string" &&*/}
      {/*  course.status.match(/^[A-D](\+|-)?$/) && (*/}
      {/*    <div className="absolute top-2 right-5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">*/}
      {/*      Completed*/}
      {/*    </div>*/}
      {/*  )}*/}
    </div>
  );
}
