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

// src/components/degree-audit/year-view/drag-drop-provider.tsx

type DndContextType = {
  onAddCourse: (year: number, semester: number) => void;
  removeCourse: (courseId: string) => void;
  semesterIds: string[];
  findCourse: (courseId: string) => CourseWithStatus | undefined;
};

const DndContextValue = createContext<DndContextType>({
  onAddCourse: () => {},
  removeCourse: () => {},
  semesterIds: [],
  findCourse: () => undefined,
});

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
        distance: 8, // 8px of movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay for touch
        tolerance: 8, // 8px of tolerance
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
      for (const yearNum in plan.years) {
        const year = plan.years[parseInt(yearNum)];
        for (const semesterKey of ["fall", "spring", "summer"] as const) {
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
      toast.error("Chale, Session not found. Please Log out and Log in again.");
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
    const [targetYear, targetSemester] = overSemesterId.split("-").map(Number);

    // Get source semester info
    const sourceSemesterId = courseData?.semester;
    if (!sourceSemesterId) return;

    const [sourceYear, sourceSemester] = sourceSemesterId
      .split("-")
      .map(Number);

    // If not moving to a different semester, do nothing
    if (sourceYear === targetYear && sourceSemester === targetSemester) {
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
