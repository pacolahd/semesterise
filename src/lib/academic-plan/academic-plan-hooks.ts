"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  addPlannedCourse,
  getAvailableCoursesForSemester,
  getStudentAcademicPlan,
  movePlannedCourse,
  removePlannedCourse,
} from "@/lib/academic-plan/academic-plan-actions";
import { CourseWithStatus, YearPlan } from "@/lib/academic-plan/types";
import { handleActionResponse } from "@/lib/errors/action-response-handler";
import { AppError } from "@/lib/errors/app-error-classes";
import { ActionResponse } from "@/lib/types/common";

// Key factory for consistent React Query cache keys
const academicPlanKeys = {
  all: ["academicPlan"] as const,
  plan: (authId: string) => [...academicPlanKeys.all, "plan", authId] as const,
  availableCourses: (authId: string, year: number, semester: number) =>
    [
      ...academicPlanKeys.all,
      "availableCourses",
      authId,
      year,
      semester,
    ] as const,
};

/**
 * Helper to handle warnings from server action responses
 */
function processWarnings(warnings?: string[]) {
  if (warnings && warnings.length > 0) {
    warnings.forEach((warning) => toast.warning(warning));
  }
}

/**
 * Hook for retrieving and managing academic plan data
 */
export function useAcademicPlan(authId?: string) {
  // Use the query hook to fetch and cache the academic plan
  const query = useQuery({
    queryKey: academicPlanKeys.plan(authId || ""),
    queryFn: async () => {
      if (!authId) {
        throw new Error(
          "Logout and Login again! Student ID is required to fetch academic plan"
        );
      }

      const result = await getStudentAcademicPlan(authId);

      // Process any warnings from the server action
      processWarnings(result.warnings);

      return handleActionResponse(result);
    },
    // Only enable the query if we have a studentId
    enabled: !!authId,
    // Stale time of 2 minutes - reasonable balance for academic data that doesn't change frequently
    staleTime: 2 * 60 * 1000,
    // Failure handling
    retry: (failureCount, error) => {
      // Only retry a few times and for certain errors
      if (failureCount > 2) return false;

      // Check if it's a server error (500+) that might be temporary
      if (error instanceof Error) {
        const errorCode = (error as any).statusCode;
        if (errorCode && errorCode >= 500) return true;
      }

      return false;
    },
    // Pass metadata to control global error handling behavior
    meta: {
      // We'll handle our own errors in the component
      skipGlobalErrorHandler: false,
      // Add additional context for the error handler
      errorContext: "academic-plan",
    },
  });

  // Handle errors at the component level if needed
  if (query.isError) {
    console.error("Academic plan query error:", query.error);
    // Note: We don't need to show a toast here since the global handler will do that
  }

  // Return the query result and a convenient refetch method
  return {
    ...query,
    plan: query.data,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch available courses for a specific semester
 */
export function useAvailableCourses(
  authId: string | undefined,
  year: number,
  semester: number
) {
  return useQuery({
    queryKey: academicPlanKeys.availableCourses(authId || "", year, semester),
    queryFn: async () => {
      if (!authId) {
        throw new Error("Not authenticated. Student ID is required.");
      }

      const result = await getAvailableCoursesForSemester(
        authId,
        year,
        semester
      );

      // Process any warnings, even if the request succeeded
      processWarnings(result.warnings);

      return handleActionResponse(result);
    },
    enabled: !!authId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    meta: {
      skipGlobalErrorHandler: false,
      errorContext: "available-courses",
    },
  });
}

/**
 * Hook to add a planned course
 */
export function useAddCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      authId,
      courseCode,
      year,
      semester,
    }: {
      authId: string;
      courseCode: string;
      year: number;
      semester: number;
    }) => {
      const result = await addPlannedCourse(authId, courseCode, year, semester);

      // Process warnings regardless of success/failure
      processWarnings(result.warnings);

      // For errors, handleActionResponse will throw
      return handleActionResponse(result);
    },
    onSuccess: (data, variables) => {
      // Invalidate the academic plan query to refresh the data
      queryClient.invalidateQueries({
        queryKey: academicPlanKeys.plan(variables.authId),
      });

      // Show success toast
      toast.success(`Added course to your plan`);
    },
    meta: {
      skipGlobalErrorHandler: false,
      errorContext: "add-course",
    },
  });
}

/**
 * Hook to move a planned course
 */
export function useMoveCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      authId,
      courseId,
      newYear,
      newSemester,
    }: {
      authId: string;
      courseId: string;
      newYear: number;
      newSemester: number;
    }) => {
      const result = await movePlannedCourse(
        authId,
        courseId,
        newYear,
        newSemester
      );

      // Process warnings regardless of success/failure
      processWarnings(result.warnings);

      return handleActionResponse(result);
    },
    onSuccess: (data, variables) => {
      // Invalidate the academic plan query to refresh the data
      queryClient.invalidateQueries({
        queryKey: academicPlanKeys.plan(variables.authId),
      });
    },
    meta: {
      skipGlobalErrorHandler: false,
      errorContext: "move-course",
    },
  });
}

/**
 * Hook to remove a planned course
 */
export function useRemoveCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      authId,
      courseId,
    }: {
      authId: string;
      courseId: string;
    }) => {
      const result = await removePlannedCourse(authId, courseId);

      // Process warnings regardless of success/failure
      processWarnings(result.warnings);

      return handleActionResponse(result);
    },
    onSuccess: (data, variables) => {
      // Invalidate the academic plan query to refresh the data
      queryClient.invalidateQueries({
        queryKey: academicPlanKeys.plan(variables.authId),
      });

      toast.success("Course removed from your plan");
    },
    meta: {
      skipGlobalErrorHandler: false,
      errorContext: "remove-course",
    },
  });
}

/**
 * Hook to perform optimistic updates on the academic plan
 * This is useful for drag and drop operations to make the UI feel responsive
 */
export function useOptimisticMoveCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      authId,
      courseId,
      newYear,
      newSemester,
      course,
    }: {
      authId: string;
      courseId: string;
      newYear: number;
      newSemester: number;
      course: CourseWithStatus;
    }) => {
      const result = await movePlannedCourse(
        authId,
        courseId,
        newYear,
        newSemester
      );

      // Process warnings right away
      processWarnings(result.warnings);

      return handleActionResponse(result);
    },
    // Optimistically update the UI before the mutation completes
    onMutate: async ({ authId, courseId, newYear, newSemester, course }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({
        queryKey: academicPlanKeys.plan(authId),
      });

      // Snapshot the previous value
      const previousPlan = queryClient.getQueryData<YearPlan>(
        academicPlanKeys.plan(authId)
      );

      // Optimistically update the cache with the new course position
      if (previousPlan) {
        // Create a deep copy of the plan to avoid mutating the cache directly
        const updatedPlan = JSON.parse(
          JSON.stringify(previousPlan)
        ) as YearPlan;

        // Remove the course from its original position
        const originalYear = course.year;
        const originalSemester = course.semester;
        const semesterKey =
          originalSemester === 1
            ? "fall"
            : originalSemester === 2
              ? "spring"
              : "summer";

        const originalSemesterCourses =
          updatedPlan.years[originalYear][semesterKey].courses;
        const courseIndex = originalSemesterCourses.findIndex(
          (c) => c.id === courseId
        );

        if (courseIndex !== -1) {
          const [removedCourse] = originalSemesterCourses.splice(
            courseIndex,
            1
          );
          updatedPlan.years[originalYear][semesterKey].totalCredits -=
            removedCourse.credits;

          // Update the course with new position
          removedCourse.year = newYear;
          removedCourse.semester = newSemester;
          removedCourse.isSummer = newSemester === 3;

          // Add to new position
          const newSemesterKey =
            newSemester === 1
              ? "fall"
              : newSemester === 2
                ? "spring"
                : "summer";
          updatedPlan.years[newYear][newSemesterKey].courses.push(
            removedCourse
          );
          updatedPlan.years[newYear][newSemesterKey].totalCredits +=
            removedCourse.credits;

          // Update credit warnings
          updatedPlan.years[originalYear][semesterKey].hasCreditWarning =
            updatedPlan.years[originalYear][semesterKey].totalCredits > 5;
          updatedPlan.years[newYear][newSemesterKey].hasCreditWarning =
            updatedPlan.years[newYear][newSemesterKey].totalCredits > 5;
        }

        // Update the cache with our optimistic update
        queryClient.setQueryData(academicPlanKeys.plan(authId), updatedPlan);
      }

      // Return the snapshot so we can rollback if something goes wrong
      return { previousPlan };
    },
    // If the mutation fails, use the context we saved to roll back
    onError: (err, { authId }, context) => {
      if (context?.previousPlan) {
        queryClient.setQueryData(
          academicPlanKeys.plan(authId),
          context.previousPlan
        );
      }

      // Let the global error handler handle the toast
      // We don't need to show a toast here
    },
    // Always refetch after error or success to make sure our local data is correct
    onSettled: (data, error, { authId }) => {
      queryClient.invalidateQueries({
        queryKey: academicPlanKeys.plan(authId),
      });
    },
    meta: {
      skipGlobalErrorHandler: false,
      errorContext: "move-course-optimistic",
    },
  });
}
