"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { toast } from "sonner";

import {
  useMoveCourse,
  useOptimisticMoveCourse,
  useRemoveCourse,
} from "@/lib/academic-plan/academic-plan-hooks";
import { CourseWithStatus, YearPlan } from "@/lib/academic-plan/types";
import { useAuthStore } from "@/lib/auth/auth-store";

import { CourseAddDialog } from "./course-add-dialog";
import { CourseCard } from "./course-card";

// Context type definition
type DndContextType = {
  onAddCourse: (year: number, semester: number) => void;
  removeCourse: (courseId: string) => void;
  semesterIds: string[];
  findCourse: (courseId: string) => CourseWithStatus | undefined;
};

// Create the context
const DndContextValue = createContext<DndContextType>({
  onAddCourse: () => {},
  removeCourse: () => {},
  semesterIds: [],
  findCourse: () => undefined,
});

// Export hook to use the context
export const useDndContext = () => useContext(DndContextValue);

interface DragDropProviderProps {
  children: ReactNode;
  plan: YearPlan;
  refreshPlan: () => Promise<void>;
}

export function DragDropProvider({
  children,
  plan,
  refreshPlan,
}: DragDropProviderProps) {
  const { user } = useAuthStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetSemester, setTargetSemester] = useState<{
    year: number;
    semester: number;
  } | null>(null);

  // Use React Query mutations
  const removeMutation = useRemoveCourse();
  const optimisticMoveMutation = useOptimisticMoveCourse();

  // Setup drag sensors with reasonable defaults to prevent accidental drags
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 3, // 3px of movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // 100ms delay for touch
        tolerance: 5, // 5px of tolerance
      },
    })
  );

  // Get semester IDs - for container recognition by dnd-kit
  const semesterIds = [];
  for (let year = 1; year <= 4; year++) {
    semesterIds.push(`${year}-1`); // Fall
    semesterIds.push(`${year}-2`); // Spring
    semesterIds.push(`${year}-3`); // Summer
  }

  // Find course by ID
  const findCourse = useCallback(
    (courseId: string): CourseWithStatus | undefined => {
      // Search through all years and semesters to find the course
      for (const yearNum in plan.years) {
        const year = plan.years[parseInt(yearNum)];
        for (const semesterKey of ["fall", "spring", "summer"] as const) {
          // Skip if the semester doesn't exist (e.g., summer might be undefined)
          if (!year[semesterKey]) continue;

          const course = year[semesterKey].courses.find(
            (c) => c.id === courseId
          );
          if (course) return course;
        }
      }
      return undefined;
    },
    [plan]
  );

  // Handle add course dialog
  const handleAddCourse = (year: number, semester: number) => {
    setTargetSemester({ year, semester });
    setDialogOpen(true);
  };

  // Handle removing a course
  const handleRemoveCourse = async (courseId: string) => {
    if (!user?.id) {
      toast.error("Session not found. Please log out and log in again.");
      return;
    }

    removeMutation.mutate(
      { authId: user.id, courseId },
      {
        onSuccess: () => {
          refreshPlan();
        },
      }
    );
  };

  // Drag start handler
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
  };

  // Drag end handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !user?.id) {
      if (!user?.id) {
        toast.error(
          "Student ID not found. Please refresh the page or contact support."
        );
      }
      return;
    }

    const courseId = active.id as string;
    const courseData = active.data.current;

    // Get target semester info from the over.id (which is semester-id)
    const overSemesterId = over.id as string;

    // More robust parsing of semester IDs
    const targetParts = overSemesterId.split("-");
    if (targetParts.length !== 2) {
      toast.error("Invalid target semester format");
      return;
    }

    const targetYear = parseInt(targetParts[0], 10);
    const targetSemester = parseInt(targetParts[1], 10);

    if (isNaN(targetYear) || isNaN(targetSemester)) {
      toast.error("Invalid semester values");
      return;
    }

    // Get source semester info
    const sourceSemesterId = courseData?.semester;
    if (!sourceSemesterId) {
      toast.error("Source semester information missing");
      return;
    }

    const sourceParts = sourceSemesterId.split("-");
    if (sourceParts.length !== 2) {
      toast.error("Invalid source semester format");
      return;
    }

    const sourceYear = parseInt(sourceParts[0], 10);
    const sourceSemester = parseInt(sourceParts[1], 10);

    if (isNaN(sourceYear) || isNaN(sourceSemester)) {
      toast.error("Invalid source semester values");
      return;
    }

    // If not moving to a different semester, do nothing
    if (sourceYear === targetYear && sourceSemester === targetSemester) {
      return;
    }

    // Check if target semester is in the past
    if (
      targetYear < plan.currentYear ||
      (targetYear === plan.currentYear && targetSemester < plan.currentSemester)
    ) {
      toast.error(
        "Cannot move courses to past semesters. Only current and future semesters are valid targets."
      );
      return;
    }

    // Validate that the years exist in the plan
    if (!plan.years[sourceYear]) {
      toast.error(`Source year ${sourceYear} not found in plan`);
      return;
    }

    if (!plan.years[targetYear]) {
      toast.error(`Target year ${targetYear} not found in plan`);
      return;
    }

    // Find the course for optimistic updates
    const course = findCourse(courseId);
    if (!course) {
      toast.error("Course not found");
      return;
    }

    // Use optimistic mutation
    optimisticMoveMutation.mutate(
      {
        authId: user.id,
        courseId,
        newYear: targetYear,
        newSemester: targetSemester,
        course,
      },
      {
        onSuccess: () => {
          // Refresh the plan to ensure consistency
          refreshPlan();
        },
      }
    );
  };

  const activeCourse = activeId ? findCourse(activeId) : undefined;

  return (
    <DndContextValue.Provider
      value={{
        onAddCourse: handleAddCourse,
        removeCourse: handleRemoveCourse,
        semesterIds,
        findCourse,
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        {children}

        {/* Drag overlay */}
        <DragOverlay>
          {activeId && activeCourse ? (
            <CourseCard course={activeCourse} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Course add dialog */}
      {targetSemester && (
        <CourseAddDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          year={targetSemester.year}
          semester={targetSemester.semester}
          onSuccess={refreshPlan}
        />
      )}
    </DndContextValue.Provider>
  );
}
