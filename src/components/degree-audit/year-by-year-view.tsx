"use client";

import { useEffect, useState } from "react";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { generateDummyData } from "@/lib/degree-audit/dummy-data";
import { Course, Semester, Year } from "@/lib/degree-audit/types";

import { AddCourseDialog } from "./add-course-dialog";
import { CourseCard } from "./course-card";
import { SemesterPanel } from "./semester-panel";

export function YearByYearView() {
  const [years, setYears] = useState<Year[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [addCourseDialogOpen, setAddCourseDialogOpen] = useState(false);
  const [targetSemesterId, setTargetSemesterId] = useState<string | null>(null);

  // Initialize sensors for drag and drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 10 pixels before activating
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      // Press delay of 250ms, with tolerance of 5px of movement
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Load dummy data on component mount
  useEffect(() => {
    const data = generateDummyData();
    setYears(data);
  }, []);

  // Handle opening the add course dialog
  const handleAddCourse = (semesterId: string) => {
    setTargetSemesterId(semesterId);
    setAddCourseDialogOpen(true);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    // Find the course being dragged
    for (const year of years) {
      for (const semester of year.semesters) {
        const course = semester.courses.find((c) => c.id === active.id);
        if (course) {
          setActiveCourse(course);
          break;
        }
      }
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Get the source and destination semester IDs
      const [sourceYearIndex, sourceSemesterIndex, sourceCourseIndex] =
        findCoursePosition(active.id as string);

      // Extract the semesterId from the over.id (format: semester-{id})
      let destSemesterId = over.id as string;
      if (destSemesterId.startsWith("course-")) {
        // If dropped on another course, extract the semester ID from the course data
        const [destYearIndex, destSemesterIndex] =
          findCoursePosition(destSemesterId);
        if (destYearIndex !== -1 && destSemesterIndex !== -1) {
          destSemesterId = years[destYearIndex].semesters[destSemesterIndex].id;
        }
      }

      // If valid positions were found, update the course position
      if (
        sourceYearIndex !== -1 &&
        sourceSemesterIndex !== -1 &&
        sourceCourseIndex !== -1
      ) {
        moveCourse(
          sourceYearIndex,
          sourceSemesterIndex,
          sourceCourseIndex,
          destSemesterId
        );
      }
    }

    // Reset active drag state
    setActiveId(null);
    setActiveCourse(null);
  };

  // Find a course's position in the state
  const findCoursePosition = (courseId: string): [number, number, number] => {
    for (let yearIndex = 0; yearIndex < years.length; yearIndex++) {
      const year = years[yearIndex];
      for (
        let semesterIndex = 0;
        semesterIndex < year.semesters.length;
        semesterIndex++
      ) {
        const semester = year.semesters[semesterIndex];
        const courseIndex = semester.courses.findIndex(
          (course) => course.id === courseId
        );
        if (courseIndex !== -1) {
          return [yearIndex, semesterIndex, courseIndex];
        }
      }
    }
    return [-1, -1, -1];
  };

  // Move a course from one semester to another
  const moveCourse = (
    sourceYearIndex: number,
    sourceSemesterIndex: number,
    sourceCourseIndex: number,
    destSemesterId: string
  ) => {
    // Create a deep copy of the years array
    const newYears = JSON.parse(JSON.stringify(years));

    // Get the course to move
    const courseToMove =
      newYears[sourceYearIndex].semesters[sourceSemesterIndex].courses[
        sourceCourseIndex
      ];

    // Remove the course from its original position
    newYears[sourceYearIndex].semesters[sourceSemesterIndex].courses.splice(
      sourceCourseIndex,
      1
    );

    // Find the destination semester
    for (const year of newYears) {
      for (const semester of year.semesters) {
        if (semester.id === destSemesterId) {
          // Add the course to the destination semester
          semester.courses.push(courseToMove);
          break;
        }
      }
    }

    // Update state with the new arrangement
    setYears(newYears);
  };

  // Add a new course to a semester
  const handleCourseAdded = (course: Course) => {
    if (!targetSemesterId) return;

    const newYears = JSON.parse(JSON.stringify(years));

    // Find the target semester and add the course
    for (const year of newYears) {
      for (const semester of year.semesters) {
        if (semester.id === targetSemesterId) {
          semester.courses.push(course);
          break;
        }
      }
    }

    setYears(newYears);
    setAddCourseDialogOpen(false);
    setTargetSemesterId(null);
  };

  // Render the year-by-year view
  return (
    <div className="w-full h-full">
      {/* Header with title and horizontal scrollbar */}
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Year by Year Planning</h1>
        <p className="text-muted-foreground">
          Organize your courses by semester to plan your entire degree program.
        </p>
      </div>

      {/* Main container with horizontal scrolling */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <div className="w-full overflow-x-visible custom-scrollbar">
          <div className="flex min-w-max space-x-4 pb-4">
            {years.map((year) => (
              <div
                key={year.id}
                className="flex flex-col w-[320px] overflow-hidden"
              >
                <div className="p-3">
                  <h2 className="body1-medium">Year {year.yearNumber}</h2>
                </div>

                {year.semesters.map((semester) => (
                  <SemesterPanel
                    key={semester.id}
                    semester={semester}
                    onAddCourse={handleAddCourse}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Drag overlay for the course being dragged */}
        <DragOverlay>
          {activeId && activeCourse ? (
            <CourseCard course={activeCourse} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Course addition dialog */}
      <AddCourseDialog
        open={addCourseDialogOpen}
        onOpenChange={setAddCourseDialogOpen}
        onCourseAdded={handleCourseAdded}
        semesterId={targetSemesterId}
      />
    </div>
  );
}
