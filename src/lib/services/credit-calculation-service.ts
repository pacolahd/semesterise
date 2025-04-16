// src/lib/services/credit-calculation-service.ts
import { and, eq } from "drizzle-orm";

import { courseGradeRequirements, gradeTypes } from "@/drizzle/schema";
import { GradeTypeRecord } from "@/drizzle/schema/academic-structure/grade-types";
import { CourseGradeRequirementRecord } from "@/drizzle/schema/curriculum/course-grade-requirements";
import { TranscriptCourse } from "@/lib/types/transcript";

/**
 * Calculate comprehensive course and credit statistics
 * Returns both total and passing credits/courses with detailed breakdown
 */
export async function calculateCourseStatistics(
  courses: TranscriptCourse[],
  majorCode: string,
  tx: any
): Promise<{
  creditsPassed: number;
  creditsTaken: number;
  coursesPassed: number;
  coursesTotal: number;
}> {
  if (!courses || courses.length === 0) {
    return {
      creditsPassed: 0,
      creditsTaken: 0,
      coursesPassed: 0,
      coursesTotal: 0,
    };
  }

  // Get course grade requirements for this major
  const gradeRequirementsResult: CourseGradeRequirementRecord[] =
    await tx.query.courseGradeRequirements.findMany({
      where: eq(courseGradeRequirements.majorCode, majorCode),
    });

  // Convert to a map for faster lookups
  const gradeRequirements: Record<string, string> = {};
  gradeRequirementsResult.forEach((req) => {
    gradeRequirements[req.courseCode.toUpperCase()] = req.minimumGrade;
  });

  // Fetch all grade types from the database
  const gradeTypesResult: GradeTypeRecord[] =
    await tx.query.gradeTypes.findMany();

  // Create a map of grade to passing status and numeric value
  const gradeInfo: Record<
    string,
    { isPassing: boolean; numericValue: number }
  > = {};
  gradeTypesResult.forEach((gt) => {
    // Convert Decimal object to number if needed
    const numValue =
      typeof gt.numericValue === "object" && "toNumber" in gt.numericValue
        ? (gt.numericValue as any).toNumber()
        : Number(gt.numericValue);

    gradeInfo[gt.grade] = {
      isPassing: gt.isPassing,
      numericValue: numValue,
    };
  });

  // Initialize statistics
  let creditsPassed = 0;
  let creditsTaken = 0;
  let coursesPassed = 0;
  let coursesTotal = 0;

  // Process each course
  for (const course of courses) {
    // Skip courses with invalid credits
    const credits = Number(course.credits);
    if (isNaN(credits) || credits < 0) {
      continue;
    }

    // Update total credits and courses
    creditsTaken += credits;
    coursesTotal++;

    const grade = course.grade.trim();

    // Clean up course code for comparison
    const courseCode = course.code.toUpperCase().replace(/\s+/g, "");

    // Check if this is a passing grade
    const isPassingGrade = gradeInfo[grade]?.isPassing || false;

    // Check if course meets minimum grade requirement
    let meetsRequirement = true;

    // Check for specific course requirement
    const minGrade = gradeRequirements[courseCode];
    if (minGrade && !meetsGradeRequirement(grade, minGrade, gradeInfo)) {
      meetsRequirement = false;
    }

    // For Computer Science major, some courses require at least C
    // if (majorCode === "CS") {
    //   // CS core programming courses require at least C
    //   const csCorePatterns = [
    //     "CS111",
    //     "CS112",
    //     "CS211",
    //     "CS212",
    //     "CS313",
    //     "CS341",
    //     "CS413",
    //   ];
    //
    //   if (csCorePatterns.some((pattern) => courseCode.includes(pattern))) {
    //     if (!meetsGradeRequirement(grade, "C", gradeInfo)) {
    //       meetsRequirement = false;
    //     }
    //   }
    // }

    // Count as passed if passing grade and meets requirements
    if (isPassingGrade && meetsRequirement) {
      creditsPassed += credits;
      coursesPassed++;
    }
  }

  return {
    creditsPassed,
    creditsTaken,
    coursesPassed,
    coursesTotal,
  };
}

/**
 * Check if a grade meets the minimum requirement using the grade types from database
 */
export function meetsGradeRequirement(
  actualGrade: string,
  minRequiredGrade: string,
  gradeInfo: Record<string, { isPassing: boolean; numericValue: number }>
): boolean {
  // If we don't have info for either grade, use a fallback
  if (!gradeInfo[actualGrade] || !gradeInfo[minRequiredGrade]) {
    console.warn(
      `Missing grade info for comparison: ${actualGrade} vs ${minRequiredGrade}`
    );
    // Fallback to basic passing check
    return gradeInfo[actualGrade]?.isPassing || false;
  }

  // Compare numeric values from the database
  return (
    gradeInfo[actualGrade].numericValue >=
    gradeInfo[minRequiredGrade].numericValue
  );
}
