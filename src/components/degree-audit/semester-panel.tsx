"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Info, Plus, PlusCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Course, Semester } from "@/lib/degree-audit/types";
import { cn } from "@/lib/utils";

import { CourseCard } from "./course-card";

interface SemesterPanelProps {
  semester: Semester;
  onAddCourse: (semesterId: string) => void;
}

export function SemesterPanel({ semester, onAddCourse }: SemesterPanelProps) {
  const { name, courses, id, creditWarning } = semester;

  // Set up droppable area for drag and drop
  const { setNodeRef, isOver } = useDroppable({
    id: `semester-${id}`,
  });

  // Calculate total credits
  const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);

  // Check if credits exceed warning threshold (5 credits as specified)
  const hasExcessiveCredits = totalCredits > 15;

  return (
    <div
      className={cn(
        "bg-surface-50 dark:bg-background p-4 my-2 border rounded-2xl",
        isOver && "bg-muted/50",
        (creditWarning || hasExcessiveCredits) && "border-danger-600"
      )}
    >
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="body1-medium">{name}</h3>
          {(creditWarning || hasExcessiveCredits) && (
            <div className="flex items-center justify-end gap-1 mt-1">
              <Info className="h-3 w-3 text-danger-700" />

              <p className="text-xs text-danger-700">Credit load warning</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="mx-1 text-xs bg-surface-500 dark:bg-transparent text-tcol-500 dark:text-tcol-100 rounded-[25px] p-[7px]
              "
          >
            {totalCredits} credits
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 bg-surface-500 dark:bg-transparent text-tcol-500 dark:text-tcol-100 rounded-full"
            onClick={() => onAddCourse(id)}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add course</span>
          </Button>
        </div>
      </div>

      <div ref={setNodeRef} className="space-y-2">
        {courses.length > 0 ? (
          <SortableContext
            items={courses.map((course) => course.id)}
            strategy={verticalListSortingStrategy}
          >
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </SortableContext>
        ) : (
          <div className="text-center py-4 border border-dashed rounded-md bg-muted/30">
            <p className="text-sm text-muted-foreground mb-2">
              No courses added to this semester yet!
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddCourse(id)}
              className="mx-auto"
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Add course
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
