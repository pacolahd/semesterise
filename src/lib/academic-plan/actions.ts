// src/lib/academic-plan/actions.ts
import { and, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  academicSemesters,
  academicYears,
  prerequisiteCourses,
  prerequisiteGroups,
  studentCourseStatusView,
  studentCourses,
  studentDegreeRequirementProgressView,
  studentProfiles,
  studentRequiredCoursesView,
} from "@/drizzle/schema";

import {
  CourseWithStatus,
  PrerequisiteCheckResult,
  Semester,
  YearPlan,
} from "./types";

// Take note and make everything consistent with the types in the database
/*
Example of data in academic semesters table:
{
    "name": "Semester 1 2024-2025",
    "academicYearName": "2024-2025",
    "sequenceNumber": 10,
    "startDate": "2024-08-15",
    "endDate": "2024-12-20"
  },
  {
    "name": "Semester 2 2024-2025",
    "academicYearName": "2024-2025",
    "sequenceNumber": 11,
    "startDate": "2025-01-10",
    "endDate": "2025-05-31"
  },
  {
    "name": "Semester 3 2024-2025",
    "academicYearName": "2024-2025",
    "sequenceNumber": 12,
    "startDate": "2025-06-01",
    "endDate": "2025-07-31"
  },
  {
    "name": "Semester 1 2025-2026",
    "academicYearName": "2025-2026",
    "sequenceNumber": 13,
    "startDate": "2025-08-15",
    "endDate": "2025-12-20"
  },
  Take note that semester 3 doesn't mean it's always summer. But summer semesters it will be marked as is_summer in the student semester mappings and also that the imported courses shown in the student course status view will have a was_summer_semester field also.

Example data in academic years table:
{
    "yearName": "2021-2022",
    "startDate": "2021-08-01",
    "endDate": "2022-07-31",
  },
  {
    "yearName": "2022-2023",
    "startDate": "2022-08-01",
    "endDate": "2023-07-31",
  },


  Example data for offered in semester or semester offering
  ["FALL", "SPRING"]
  meaning something like offered_in_semesters will contain data like ["fall", "spring", "summer"]. the courses table and the student required courses view have an offered_in_semesters field

 */

// Category color mapping for UI
const CATEGORY_COLORS = {
  "Required Major Classes": "#4A90E2",
  "Major Electives": "#50E3C2",
  "Humanities & Social Sciences": "#F5A623",
  "Mathematics & Quantitative": "#7ED321",
  Business: "#D0021B",
  Computing: "#9013FE",
  Science: "#BD10E0",
  Capstone: "#8B572A",
  "Non-Major Electives": "#9B9B9B",
  "Research / Project Prep.": "#417505",
};

/**
 * Get student's 4-year academic plan
 */
export async function getStudentAcademicPlan(
  studentId: string
): Promise<YearPlan> {
  // 1. Get student profile information
  const profileData = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.studentId, studentId),
  });

  if (!profileData) {
    throw new Error(`Student not found: ${studentId}`);
  }

  // 2. Get all student courses with statuses from the view
  const coursesWithStatus = await db
    .select()
    .from(studentCourseStatusView)
    .where(eq(studentCourseStatusView.studentId, studentId));

  // 3. Get all required courses for the student
  const requiredCourses = await db
    .select()
    .from(studentRequiredCoursesView)
    .where(eq(studentRequiredCoursesView.studentId, studentId));

  // 4. Get progress information by category
  const progressByCategory = await db
    .select()
    .from(studentDegreeRequirementProgressView)
    .where(eq(studentDegreeRequirementProgressView.studentId, studentId));

  // 5. Initialize empty plan structure
  const plan: YearPlan = {
    studentId,
    majorCode: profileData.majorCode || "",
    mathTrack: profileData.mathTrackName || undefined,
    capstoneOption: profileData.capstoneOptionName || undefined,
    years: {},
    totalCreditsCompleted: 0,
    totalCreditsRemaining: 0,
    percentageComplete: 0,
    lastUpdated: new Date(),
  };

  // Initialize all years and semesters
  for (let year = 1; year <= 4; year++) {
    plan.years[year] = {
      fall: createEmptySemester(year, 1, "Fall"),
      spring: createEmptySemester(year, 2, "Spring"),
      summer: createEmptySemester(year, 3, "Summer", true),
    };
  }

  // 6. Populate with actual courses
  for (const course of coursesWithStatus) {
    // Skip if not latest attempt for completed/failed courses
    if (!course.isLatestAttempt && course.grade !== null) {
      continue;
    }

    // Determine which semester this belongs to
    const year = course.yearTaken || 1;
    const isSummer = course.wasSummerSemester || false;
    const semester = isSummer ? 3 : course.semesterTaken || 1;

    // Get the appropriate semester object
    let targetSemester: Semester;
    if (semester === 1) {
      targetSemester = plan.years[year].fall;
    } else if (semester === 2) {
      targetSemester = plan.years[year].spring;
    } else {
      targetSemester = plan.years[year].summer;
    }

    // Create course object with status from the view
    const courseWithStatus: CourseWithStatus = {
      id: course.studentCourseId,
      courseCode: course.courseCode,
      courseTitle: course.courseTitle || "",
      credits: Number(course.credits) || 0,
      category: {
        name: course.categoryName || "General",
        parentName: getCategoryParent(course.categoryName),
        //TODO: add validation checks for color mapping to make it less fragile
        color:
          CATEGORY_COLORS[
            course.categoryName as keyof typeof CATEGORY_COLORS
          ] || "#9B9B9B",
      },
      departmentCode: course.departmentCode || "",

      // Determine status based on grade and passing info from the view
      status:
        course.grade === null
          ? "planned"
          : course.passed
            ? "completed"
            : "failed",

      grade: course.grade || undefined,
      minGradeRequired: course.minimumGradeRequired || undefined,

      retakeNeeded: course.retakeNeeded || false,
      isLatestAttempt: course.isLatestAttempt || false,
      totalAttempts: course.totalAttempts || 0,

      year,
      semester: isSummer ? 3 : course.semesterTaken || 1,
      isSummer,

      // Generate info message for UI tooltip
      infoMessage: generateCourseInfoMessage(course),
      hasWarning: course.retakeNeeded || false,
    };

    // Add to appropriate semester
    targetSemester.courses.push(courseWithStatus);

    // Update semester credit count
    targetSemester.totalCredits += courseWithStatus.credits;
  }

  // 7. Add warning for semesters with too many credits (>5)
  for (let year = 1; year <= 4; year++) {
    const yearObj = plan.years[year];
    yearObj.fall.hasCreditWarning = yearObj.fall.totalCredits > 5;
    yearObj.spring.hasCreditWarning = yearObj.spring.totalCredits > 5;
    // No warning for summer
  }

  // 8. Calculate overall progress statistics
  const totalProgress = progressByCategory.reduce(
    (acc, category) => {
      // Only count parent categories for the overall progress
      if (!category.subCategory) {
        acc.completed += Number(category.creditsCompleted);
        acc.required += Number(category.creditsRequired);
      }
      return acc;
    },
    { completed: 0, required: 0 }
  );

  plan.totalCreditsCompleted = totalProgress.completed;
  plan.totalCreditsRemaining = Math.max(
    0,
    totalProgress.required - totalProgress.completed
  );
  plan.percentageComplete =
    totalProgress.required > 0
      ? Math.min(
          100,
          Math.round((totalProgress.completed / totalProgress.required) * 100)
        )
      : 0;

  return plan;
}

/**
 * Create an empty semester object
 */
function createEmptySemester(
  year: number,
  semester: number,
  name: string,
  isSummer = false
): Semester {
  return {
    year,
    semester,
    isSummer,
    name,
    courses: [],
    totalCredits: 0,
    hasCreditWarning: false,
  };
}

/**
 * Get available courses a student can add to a specific semester
 */
export async function getAvailableCoursesForSemester(
  studentId: string,
  year: number,
  semester: number
): Promise<
  { code: string; title: string; credits: number; category: string }[]
> {
  // 1. Get student profile
  const profile = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.studentId, studentId),
  });

  if (!profile) {
    throw new Error(`Student not found: ${studentId}`);
  }

  // 2. Get all courses the student has already completed or planned
  const existingCourses = await db
    .select({
      courseCode: studentCourseStatusView.courseCode,
      passed: studentCourseStatusView.passed,
    })
    .from(studentCourseStatusView)
    .where(eq(studentCourseStatusView.studentId, studentId));

  // Create sets for quick lookups
  const passedCourses = new Set<string>();
  const allTakenCourses = new Set<string>();

  existingCourses.forEach((course) => {
    allTakenCourses.add(course.courseCode);
    if (course.passed) {
      passedCourses.add(course.courseCode);
    }
  });

  // 3. Get required courses from the view
  const requiredCourses = await db
    .select({
      courseCode: studentRequiredCoursesView.courseCode,
      categoryName: studentRequiredCoursesView.categoryName,
      credits: studentRequiredCoursesView.credits,
      courseTitle: studentRequiredCoursesView.courseTitle,
    })
    .from(studentRequiredCoursesView)
    .where(
      and(
        eq(studentRequiredCoursesView.studentId, studentId),
        // Only include actual courses, not placeholders
        sql`courseCode IS NOT NULL`
      )
    );

  //ToDo: Should filter by semester offering as well. Meaning it should show courses that are offered in the current semester first before those which aren't

  // 4. Filter courses based on prerequisites and other criteria
  const availableCourses = [];

  for (const course of requiredCourses) {
    // Skip if already passed
    if (passedCourses.has(course.courseCode)) {
      continue;
    }

    // Check prerequisites
    const prerequisiteCheck = await checkPrerequisitesMet(
      studentId,
      course.courseCode,
      year,
      semester
    );

    // Only include courses with prerequisites met
    if (prerequisiteCheck.isMet) {
      availableCourses.push({
        code: course.courseCode,
        title: course.courseTitle,
        credits: Number(course.credits),
        category: course.categoryName,
      });
    }
  }

  return availableCourses;
}

/**
 * Add a planned course to a student's academic plan
 */

/* TODOs for both planning and moving courses
//TODO: we should also check if the course is being offered in the semester wherein the student is planning to take it. The student should be warned about planning the course in semesters where they're not offered but should still be allowed to go forward with it. Perhaps a dialog should be shown to the student with a warning message that the course doesn't seem to be offered in that semester and hence their year by year plan may not be accurate and they can click "i understand" or something like that.
   We should also do Credit load validation checks and warn the student that they are gonna be exceeding the max credits per semester and that they need to reduce the number of courses or plan the course in another semester or perhaps a summer semester to balance it out. Nevertheless students can take more than minimum credits after submitting an Extra course addition petition and receiving the approval of the petition. SO they can proceed with planning the course after confirming that they have that approval.
   If adding a course to a summer semester, the student should be warned that courses offered in summer semesters are unknown until that time is closer. This is because summer semesters are not always guaranteed to have the same courses as fall/spring semesters. They should be allowed to proceed only after confirming that they understand that their year by year plan may not be accurate.
   Students should be allowed to have more than 4 years in their plan but they should be warned that they are exceeding the maximum number of years allowed in the program and that they should be careful about that especially if they are on scholarship. They will have to let their guardians and sponsors know (sponsors for scholarship students is the Financial Aid Office but that of non scholarship students is typically their parents). They should be allowed to proceed though after confirming that they understand.
   If a student is trying to remove a course from a semester, they can be allowed after understanding that they will still have to take the course in a future semester and that they should be plan it in a future semester. They should be allowed to proceed after confirming that they understand.

// of course some of the things proposed above have to do with the UI itself and we can't fully implement those in server actions am i right?. But we just need those functionality to be set up with all they need to be "implementable" on the frontend. I hope i'm not wrong.



TODO:  Also, perhaps we could have such validation if you think it makes sense at all:
   export function validateAcademicPlanAction(
      action: 'add' | 'move' | 'remove'
    ) {
      return async (req: Request) => {
        // Validate semester bounds
        // Check course existence
        // Verify student ownership
      };
    }



TODO: Also, the student course status view has year_taken, semester_taken and was_summer_semester fields which can be used to determine the semester and year of courses that have been taken already. Perhaps we should rename them or add new fields to the view to accommodate planned courses' year and semester planned and if it's summer or not.
 */

export async function addPlannedCourse(
  studentId: string,
  courseCode: string,
  year: number,
  semester: number
): Promise<{ success: boolean; message?: string }> {
  // 1. Check prerequisites
  const prerequisiteCheck = await checkPrerequisitesMet(
    studentId,
    courseCode,
    year,
    semester
  );
  if (!prerequisiteCheck.isMet) {
    return {
      success: false,
      message: `Prerequisites not met: ${prerequisiteCheck.infoMessage || "Missing prerequisites"}`,
    };
  }

  // 2. Check if student already passed this course
  const existingCourses = await db
    .select({
      course_code: studentCourseStatusView.courseCode,
      passed: studentCourseStatusView.passed,
    })
    .from(studentCourseStatusView)
    .where(
      and(
        eq(studentCourseStatusView.studentId, studentId),
        eq(studentCourseStatusView.courseCode, courseCode)
      )
    );

  //TODO: Make this such that students can take a course though they have already passed it if the retake_limit_reached = false from the student course status view.
  const alreadyPassed = existingCourses.some((c) => c.passed);
  if (alreadyPassed) {
    return { success: false, message: "You've already passed this course" };
  }

  // 3. Get semester ID for the target semester
  const isSummer = semester === 3;

  const academicSemester = await getAcademicSemesterForProgramSemester(
    //TODO: Improve the mapping logic if need be.
    year,
    isSummer ? null : semester,
    isSummer
  );

  if (!academicSemester) {
    return {
      success: false,
      message: "Could not find matching academic semester",
    };
  }

  // 4. Add the planned course to student_courses table
  try {
    await db.insert(studentCourses).values({
      studentId,
      courseCode,
      semesterId: academicSemester.id,
      status: "planned", // Using our simplified status values
    });

    return { success: true, message: "Course added to plan" };
  } catch (error) {
    console.error("Error adding planned course:", error);
    return { success: false, message: "Failed to add course to plan" };
  }
}

/**
 * Move a planned course to a different semester
 */
export async function movePlannedCourse(
  studentId: string,
  courseId: string,
  newYear: number,
  newSemester: number
): Promise<{ success: boolean; message?: string }> {
  // 1. Check if student course exists and is planned
  const courseRecord = await db.query.studentCourses.findFirst({
    where: and(
      eq(studentCourses.id, courseId),
      eq(studentCourses.studentId, studentId),
      eq(studentCourses.status, "planned")
    ),
  });

  if (!courseRecord) {
    return {
      success: false,
      message: "Course not found or not a planned course",
    };
  }

  // 2. Check prerequisites for new semester
  const prerequisiteCheck = await checkPrerequisitesMet(
    studentId,
    courseRecord.courseCode,
    newYear,
    newSemester
  );

  if (!prerequisiteCheck.isMet) {
    return {
      success: false,
      message: `Prerequisites not met: ${prerequisiteCheck.infoMessage || "Missing prerequisites"}`,
    };
  }

  // 3. Get academic semester for the new program semester
  const isSummer = newSemester === 3;
  const newAcademicSemester = await getAcademicSemesterForProgramSemester(
    //TODO: Improve the mapping logic if need be.
    newYear,
    isSummer ? null : newSemester,
    isSummer
  );

  if (!newAcademicSemester) {
    return {
      success: false,
      message: "Could not find matching academic semester",
    };
  }

  // 4. Update the course's semester
  try {
    await db
      .update(studentCourses)
      .set({ semesterId: newAcademicSemester.id })
      .where(eq(studentCourses.id, courseId));

    return { success: true, message: "Course moved successfully" };
  } catch (error) {
    console.error("Error moving planned course:", error);
    return { success: false, message: "Failed to move course" };
  }
}

/**
 * Remove a planned course from a student's plan
 */
export async function removePlannedCourse(
  studentId: string,
  courseId: string
): Promise<{ success: boolean; message?: string }> {
  // 1. Check if student course exists and is planned
  const courseRecord = await db.query.studentCourses.findFirst({
    where: and(
      eq(studentCourses.id, courseId),
      eq(studentCourses.studentId, studentId),
      eq(studentCourses.status, "planned")
    ),
  });

  if (!courseRecord) {
    return {
      success: false,
      message: "Course not found or not a planned course",
    };
  }

  // 2. Remove the course
  try {
    await db.delete(studentCourses).where(eq(studentCourses.id, courseId));

    return { success: true, message: "Course removed from plan" };
  } catch (error) {
    console.error("Error removing planned course:", error);
    return { success: false, message: "Failed to remove course" };
  }
}

/**
 * Check if prerequisites are met for a course in a specific semester
 */
export async function checkPrerequisitesMet(
  studentId: string,
  courseCode: string,
  year: number,
  semester: number
): Promise<PrerequisiteCheckResult> {
  // 1. Get all prerequisite groups for this course
  const prereqGroups = await db
    .select()
    .from(prerequisiteGroups)
    .where(eq(prerequisiteGroups.courseCode, courseCode));

  // If no prerequisites, return true immediately
  if (prereqGroups.length === 0) {
    return {
      courseCode,
      isMet: true,
    };
  }

  // 2. Get passed courses for this student from the view
  const passedCourses = await db
    .select({
      courseCode: studentCourseStatusView.courseCode,
      passed: studentCourseStatusView.passed,
      year: studentCourseStatusView.yearTaken,
      semester: studentCourseStatusView.semesterTaken,
    })
    .from(studentCourseStatusView)
    .where(
      and(
        eq(studentCourseStatusView.studentId, studentId),
        eq(studentCourseStatusView.passed, true)
      )
    );

  // 3. Get planned courses
  const plannedCourses = await db
    .select({
      courseCode: studentCourses.courseCode,
      semesterId: studentCourses.semesterId,
    })
    .from(studentCourses)
    .where(
      and(
        eq(studentCourses.studentId, studentId),
        eq(studentCourses.status, "planned")
      )
    );

  // 4. Get semester mappings for planned courses
  const plannedSemesters = await db
    .select({
      //TODO: Add Query to extract program year and semester
      semesterId: academicSemesters.id,
      programYear: sql<number>`...`, // Query to extract program year
      programSemester: sql<number>`...`, // Query to extract program semester
    })
    .from(academicSemesters)
    .where(sql`id = ANY(${plannedCourses.map((c) => c.semesterId)})`);

  // Create a map for semester information
  const semesterMap = new Map();
  plannedSemesters.forEach((s) => {
    semesterMap.set(s.semesterId, {
      year: s.programYear,
      semester: s.programSemester,
    });
  });

  // 5. Filter planned courses to only those that would be taken before current semester
  const validPlannedCourses = plannedCourses
    .filter((course) => {
      const semInfo = semesterMap.get(course.semesterId);
      if (!semInfo) return false;

      return (
        semInfo.year < year ||
        (semInfo.year === year && semInfo.semester < semester)
      );
    })
    .map((c) => c.courseCode);

  // 6. Set of all courses that could be used to satisfy prerequisites
  const availableCourses = new Set([
    ...passedCourses.map((c) => c.courseCode),
    ...validPlannedCourses,
  ]);

  // 7. Check each prerequisite group
  const missingPrerequisites = [];
  let allGroupsMet = true;

  for (const group of prereqGroups) {
    // Skip concurrent or recommended groups
    if (group.isConcurrent || group.isRecommended) {
      continue;
    }

    // Get all courses in this prerequisite group
    const prereqCourses = await db
      .select({
        prereqCourseCode: prerequisiteCourses.prerequisiteCourseCode,
      })
      .from(prerequisiteCourses)
      .where(eq(prerequisiteCourses.groupKey, group.groupKey));

    let groupSatisfied = false;

    // AND logic requires all courses in the group
    if (group.internalLogicOperator === "AND") {
      groupSatisfied = prereqCourses.every((c) =>
        availableCourses.has(c.prereqCourseCode)
      );
    }
    // OR logic requires at least one course in the group
    else {
      groupSatisfied = prereqCourses.some((c) =>
        availableCourses.has(c.prereqCourseCode)
      );
    }

    // Check if group is satisfied
    if (!groupSatisfied) {
      allGroupsMet = false;

      // Add to missing prerequisites
      missingPrerequisites.push({
        groupName: group.groupName,
        courses: prereqCourses.map((c) => c.prereqCourseCode),
        requiredCount:
          group.internalLogicOperator === "AND" ? prereqCourses.length : 1,
        satisfiedCount: prereqCourses.filter((c) =>
          availableCourses.has(c.prereqCourseCode)
        ).length,
      });
    }
  }

  // 8. Generate info message for UI
  let infoMessage = "";
  if (!allGroupsMet) {
    infoMessage = missingPrerequisites
      .map(
        (g) =>
          `${g.groupName}: need ${g.requiredCount} course(s), have ${g.satisfiedCount}`
      )
      .join("; ");
  }

  return {
    courseCode,
    isMet: allGroupsMet,
    missingPrerequisites: allGroupsMet ? undefined : missingPrerequisites,
    infoMessage: allGroupsMet ? undefined : infoMessage,
  };
}

/**
 * Helper function to get the academic semester for a program semester
 */
async function getAcademicSemesterForProgramSemester(
  programYear: number,
  programSemester: number | null,
  isSummer: boolean
): Promise<{ id: string } | null> {
  // For now, use a simple mock implementation// In real system, this would use actual academic calendars// This is a placeholder that should be replaced with actual logic

  // For simplicity, we'll use the most recent academic year
  const academicYear = await db.query.academicYears.findFirst({
    where: eq(academicYears.isCurrent, true),
  });

  if (!academicYear) {
    // Fallback to any academic year if no current one found
    const anyYear = await db.query.academicYears.findFirst();
    if (!anyYear) return null;

    // Find the semester by sequence number
    const semester = await db.query.academicSemesters.findFirst({
      where: and(
        eq(academicSemesters.academicYearName, anyYear.yearName),
        eq(
          academicSemesters.sequenceNumber,
          isSummer ? 3 : programSemester || 1
        )
      ),
    });

    return semester ? { id: semester.id } : null;
  }

  // Find the semester by sequence number
  const semester = await db.query.academicSemesters.findFirst({
    where: and(
      eq(academicSemesters.academicYearName, academicYear.yearName),
      eq(academicSemesters.sequenceNumber, isSummer ? 3 : programSemester || 1)
    ),
  });

  return semester ? { id: semester.id } : null;
}

/**
 * Helper function to generate course info messages for UI tooltips
 */
function generateCourseInfoMessage(course: any): string {
  if (course.grade === null) {
    return "Planned course";
  }

  if (course.retake_needed) {
    return `Failed with ${course.grade}. Minimum required: ${course.minimum_grade_required}. Retake required.`;
  }

  if (course.voluntary_retake_possible) {
    return `Passed with ${course.grade}. You can retake to improve your grade.`;
  }

  if (course.passed) {
    return `Successfully completed with grade ${course.grade}`;
  }

  return "Course information";
}

/**
 * Helper function to get parent category
 */
function getCategoryParent(categoryName?: string): string {
  if (!categoryName) return "GENERAL";

  if (
    [
      "Humanities & Social Sciences",
      "Business",
      "Mathematics & Quantitative",
      "Computing",
      "Science",
      "Research / Project Prep.",
      "Non-Major Electives",
    ].includes(categoryName)
  ) {
    return "LIBERAL ARTS & SCIENCES CORE";
  }

  if (
    ["Required Major Classes", "Major Electives", "Capstone"].includes(
      categoryName
    )
  ) {
    return "MAJOR";
  }

  return "GENERAL";
}

/**
 * Helper to get program year from academic year
 */
function getYearFromAcademicYear(academicYear: number): number {
  // This is a simplification - actual logic would depend on institutional rules// Placeholder implementation
  return academicYear % 4 === 0 ? 4 : academicYear % 4;
}
