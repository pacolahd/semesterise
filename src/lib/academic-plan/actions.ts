// src/lib/academic-plan/actions.ts
import { and, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  academicSemesters,
  courses,
  prerequisiteCourses,
  prerequisiteGroups,
  studentCourseStatusView,
  studentCourses,
  studentDegreeRequirementProgressView,
  studentProfiles,
  studentRequiredCoursesView,
  studentSemesterMappings,
} from "@/drizzle/schema";
import { StudentSemesterMappingRecord } from "@/drizzle/schema/student-records/student-semester-mappings";
import { AppError } from "@/lib/errors/app-error-classes";
import { serializeError } from "@/lib/errors/error-converter";
import { ActionResponse } from "@/lib/types/common";

import {
  CourseWithStatus,
  PrerequisiteCheckResult,
  Semester,
  YearPlan,
} from "./types";

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

// Constants for validation
const MAX_CREDITS_PER_SEMESTER = 5;
const MAX_RECOMMENDED_YEARS = 4;

/**
 * Get student's 4-year academic plan
 */
export async function getStudentAcademicPlan(
  studentId: string
): Promise<ActionResponse<YearPlan>> {
  try {
    // 1. Get student profile information
    const profileData = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.studentId, studentId),
    });

    if (!profileData) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: `Student not found: ${studentId}`,
            code: "STUDENT_NOT_FOUND",
          })
        ),
      };
    }

    // 2. Get all student courses with statuses from the view
    const coursesWithStatus = await db
      .select()
      .from(studentCourseStatusView)
      .where(eq(studentCourseStatusView.studentId, studentId));

    // 3. Get progress information by category
    const progressByCategory = await db
      .select()
      .from(studentDegreeRequirementProgressView)
      .where(eq(studentDegreeRequirementProgressView.studentId, studentId));

    // 4. Initialize empty plan structure
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

    // 5. Populate with actual courses
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
          color:
            CATEGORY_COLORS[
              course.categoryName as keyof typeof CATEGORY_COLORS
            ] || "#9B9B9B",
        },
        departmentCode: course.departmentCode || "",

        // Status is determined by the student_course_status_view
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
        semester: isSummer ? 3 : semester,
        isSummer,

        // Generate info message for UI tooltip
        infoMessage: generateCourseInfoMessage(course),
        hasWarning: course.retakeNeeded || false,
      };

      // Add to appropriate semester
      targetSemester.courses.push(courseWithStatus);
      targetSemester.totalCredits += courseWithStatus.credits;
    }

    // 6. Add warning for semesters with too many credits
    for (let year = 1; year <= 4; year++) {
      const yearObj = plan.years[year];
      yearObj.fall.hasCreditWarning =
        yearObj.fall.totalCredits > MAX_CREDITS_PER_SEMESTER;
      yearObj.spring.hasCreditWarning =
        yearObj.spring.totalCredits > MAX_CREDITS_PER_SEMESTER;
      // No warning for summer
    }

    // 7. Calculate overall progress statistics
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

    return {
      success: true,
      data: plan,
    };
  } catch (error) {
    console.error("Error getting student academic plan:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Validates course placement in a specific semester
 * Centralizes validation logic used by multiple course planning functions
 */
async function validateCoursePlacement(
  studentId: string,
  courseCode: string,
  year: number,
  semester: number
): Promise<{
  isValid: boolean;
  studentProfile?: any;
  semesterMapping?: StudentSemesterMappingRecord | null;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Get student profile for validations
  const studentProfile = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.studentId, studentId),
  });

  if (!studentProfile?.cohortYear) {
    return {
      isValid: false,
      errors: ["Student profile incomplete or missing"],
      warnings: [],
    };
  }

  // 2. Check prerequisites
  const prerequisiteCheck = await checkPrerequisitesMet(
    studentId,
    courseCode,
    year,
    semester
  );

  if (!prerequisiteCheck.isMet) {
    errors.push(
      `Prerequisites not met: ${prerequisiteCheck.infoMessage || "Missing prerequisites"}`
    );
  }

  // 3. Check if course is offered in the target semester
  const isSummer = semester === 3;
  const courseAvailability = await checkCourseAvailability(
    courseCode,
    semester,
    isSummer
  );

  if (!courseAvailability.isOffered) {
    warnings.push(
      courseAvailability.warning ||
        `This course may not be offered in ${getSemesterName(semester, isSummer)} semester`
    );
  }

  // 4. Check credit load for the semester
  const semesterCredits = await getSemesterCredits(
    studentId,
    year,
    semester,
    courseCode
  );

  if (semesterCredits.total > MAX_CREDITS_PER_SEMESTER) {
    warnings.push(
      `This will exceed the recommended credit limit of ${MAX_CREDITS_PER_SEMESTER} credits per semester. Current: ${semesterCredits.existing}, New: ${semesterCredits.new}, Total would be: ${semesterCredits.total}`
    );
  }

  // 5. Check if exceeding max recommended years
  if (year > MAX_RECOMMENDED_YEARS) {
    warnings.push(
      `This extends your plan beyond the recommended ${MAX_RECOMMENDED_YEARS} years. Please consult with your academic advisor`
    );
  }

  // 6. Special warning for summer courses
  if (isSummer) {
    warnings.push(
      "Course offerings in summer semesters are not guaranteed and may change. Check with your advisor closer to the registration period"
    );
  }

  // 7. Get semester ID and create mapping if necessary (only if no errors)
  let semesterMapping = null;
  if (errors.length === 0) {
    semesterMapping = await addStudentSemesterMappingIfNotExists(
      studentId,
      studentProfile.cohortYear,
      year,
      semester,
      isSummer
    );

    if (!semesterMapping) {
      errors.push("Could not find or create semester mapping");
    }
  }

  return {
    isValid: errors.length === 0,
    studentProfile,
    semesterMapping,
    errors,
    warnings,
  };
}

/**
 * Add a planned course to a student's academic plan
 */
export async function addPlannedCourse(
  studentId: string,
  courseCode: string,
  year: number,
  semester: number
): Promise<ActionResponse<{ courseId: string }>> {
  try {
    // 1. Check if student already passed this course (specific to add)
    const courseStatus = await db
      .select()
      .from(studentCourseStatusView)
      .where(
        and(
          eq(studentCourseStatusView.studentId, studentId),
          eq(studentCourseStatusView.courseCode, courseCode),
          eq(studentCourseStatusView.isLatestAttempt, true)
        )
      );

    const additionalWarnings: string[] = [];
    if (courseStatus.length > 0 && courseStatus[0].passed) {
      if (!courseStatus[0].voluntaryRetakePossible) {
        return {
          success: false,
          error: serializeError(
            new AppError({
              message: "You've already passed this course and cannot retake it",
              code: "COURSE_ADD_ERROR",
            })
          ),
        };
      } else {
        additionalWarnings.push(
          "You've already passed this course but retaking may improve your grade."
        );
      }
    }

    // 2. Use shared validation logic
    const validation = await validateCoursePlacement(
      studentId,
      courseCode,
      year,
      semester
    );

    if (!validation.isValid) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: validation.errors[0],
            code: "COURSE_ADD_ERROR",
            details: { errors: validation.errors },
          })
        ),
        warnings: [...validation.warnings, ...additionalWarnings],
      };
    }

    // 3. Add the course
    const [newCourse] = await db
      .insert(studentCourses)
      .values({
        studentId,
        courseCode,
        semesterId: validation.semesterMapping!.academicSemesterId,
        status: "planned",
      })
      .returning();

    return {
      success: true,
      data: { courseId: newCourse.id },
      warnings:
        [...validation.warnings, ...additionalWarnings].length > 0
          ? [...validation.warnings, ...additionalWarnings]
          : undefined,
    };
  } catch (error) {
    console.error("Error adding planned course:", error);
    return {
      success: false,
      error: serializeError(error),
    };
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
): Promise<ActionResponse<void>> {
  try {
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
        error: serializeError(
          new AppError({
            message: "Course not found or not a planned course",
            code: "INVALID_COURSE",
          })
        ),
      };
    }

    // 2. Use shared validation logic
    const validation = await validateCoursePlacement(
      studentId,
      courseRecord.courseCode,
      newYear,
      newSemester
    );

    if (!validation.isValid) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: validation.errors[0],
            code: "COURSE_MOVE_ERROR",
            details: { errors: validation.errors },
          })
        ),
        warnings: validation.warnings,
      };
    }

    // 3. Move the course
    await db
      .update(studentCourses)
      .set({ semesterId: validation.semesterMapping!.academicSemesterId })
      .where(eq(studentCourses.id, courseId));

    return {
      success: true,
      warnings:
        validation.warnings.length > 0 ? validation.warnings : undefined,
    };
  } catch (error) {
    console.error("Error moving planned course:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Remove a planned course from a student's plan
 */
export async function removePlannedCourse(
  studentId: string,
  courseId: string
): Promise<ActionResponse<void>> {
  const warnings: string[] = [];

  try {
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
        error: serializeError(
          new AppError({
            message: "Course not found or not a planned course",
            code: "INVALID_COURSE",
          })
        ),
      };
    }

    // 2. Check if course is required
    const requiredCourses = await db
      .select()
      .from(studentRequiredCoursesView)
      .where(
        and(
          eq(studentRequiredCoursesView.studentId, studentId),
          eq(studentRequiredCoursesView.courseCode, courseRecord.courseCode)
        )
      );

    if (requiredCourses.length > 0) {
      warnings.push(
        "This is a required course for your degree. You will need to plan it in a future semester to meet graduation requirements"
      );
    }

    // 3. Remove the course
    await db.delete(studentCourses).where(eq(studentCourses.id, courseId));

    return {
      success: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error("Error removing planned course:", error);
    return {
      success: false,
      error: serializeError(error),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

/**
 * Get available courses a student can add to a specific semester
 */
export async function getAvailableCoursesForSemester(
  studentId: string,
  year: number,
  semester: number
): Promise<
  ActionResponse<
    { code: string; title: string; credits: number; category: string }[]
  >
> {
  try {
    // 1. Get student profile
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.studentId, studentId),
    });

    if (!profile) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: `Student not found: ${studentId}`,
            code: "STUDENT_NOT_FOUND",
          })
        ),
      };
    }

    // 2. Get all courses the student has already passed from the view
    const passedCourses = await db
      .select({
        courseCode: studentCourseStatusView.courseCode,
      })
      .from(studentCourseStatusView)
      .where(
        and(
          eq(studentCourseStatusView.studentId, studentId),
          eq(studentCourseStatusView.passed, true)
        )
      );

    const passedCourseCodes = new Set(passedCourses.map((c) => c.courseCode));

    // 3. Get required courses from the view
    const requiredCourses = await db
      .select({
        courseCode: studentRequiredCoursesView.courseCode,
        categoryName: studentRequiredCoursesView.categoryName,
        credits: studentRequiredCoursesView.credits,
        courseTitle: studentRequiredCoursesView.courseTitle,
        offeredInSemesters: studentRequiredCoursesView.offeredInSemesters,
      })
      .from(studentRequiredCoursesView)
      .where(
        and(
          eq(studentRequiredCoursesView.studentId, studentId),
          // Only include actual courses, not placeholders
          sql`course_code IS NOT NULL`
        )
      );

    // 4. Filter courses based on prerequisites and other criteria
    const availableCourses = [];
    const isSummer = semester === 3;
    const semesterType = isSummer
      ? "summer"
      : semester === 1
        ? "fall"
        : "spring";

    for (const course of requiredCourses) {
      // Skip if already passed
      if (passedCourseCodes.has(course.courseCode)) {
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
        const isOfferedInSemester = course.offeredInSemesters?.includes(
          semesterType as "fall" | "spring" | "summer"
        );

        availableCourses.push({
          code: course.courseCode,
          title: course.courseTitle,
          credits: Number(course.credits),
          category: course.categoryName,
          offeredInSemester: isOfferedInSemester,
        });
      }
    }

    // Sort courses: offered in current semester first
    availableCourses.sort((a, b) => {
      if (a.offeredInSemester && !b.offeredInSemester) return -1;
      if (!a.offeredInSemester && b.offeredInSemester) return 1;
      return 0;
    });

    return {
      success: true,
      data: availableCourses,
    };
  } catch (error) {
    console.error("Error getting available courses:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Helper function to get semester name
 */
function getSemesterName(semester: number, isSummer: boolean): string {
  if (isSummer) return "Summer";
  if (semester === 1) return "Fall";
  if (semester === 2) return "Spring";
  return "Unknown";
}

/**
 * Helper function to check course availability by offering pattern
 */
async function checkCourseAvailability(
  courseCode: string,
  programSemester: number,
  isSummer: boolean
): Promise<{ isOffered: boolean; warning?: string }> {
  // Get course offering information
  const course = await db.query.courses.findFirst({
    where: eq(courses.code, courseCode),
    columns: { offeredInSemesters: true },
  });

  if (!course) {
    return { isOffered: false, warning: "Course not found" };
  }

  const semesterType = isSummer
    ? "summer"
    : programSemester === 1
      ? "fall"
      : "spring";

  const isOffered = course.offeredInSemesters.includes(
    semesterType as "fall" | "spring" | "summer"
  );

  return {
    isOffered,
    warning: isOffered
      ? undefined
      : `This course is typically not offered in ${semesterType} semester. You may need to adjust your planning if this course isn't available`,
  };
}

/**
 * Helper function to calculate semester credits
 */
async function getSemesterCredits(
  studentId: string,
  year: number,
  semester: number,
  additionalCourseCode?: string
): Promise<{ existing: number; new: number; total: number }> {
  // Get existing credits in the semester
  const semesterCourses = await db
    .select({
      credits: studentCourseStatusView.credits,
    })
    .from(studentCourseStatusView)
    .where(
      and(
        eq(studentCourseStatusView.studentId, studentId),
        eq(studentCourseStatusView.yearTaken, year),
        eq(studentCourseStatusView.semesterTaken, semester)
      )
    );

  const existingCredits = semesterCourses.reduce(
    (sum, course) => sum + Number(course.credits || 0),
    0
  );

  let newCredits = 0;
  if (additionalCourseCode) {
    const course = await db.query.courses.findFirst({
      where: eq(courses.code, additionalCourseCode),
      columns: { credits: true },
    });
    newCredits = Number(course?.credits || 0);
  }

  return {
    existing: existingCredits,
    new: newCredits,
    total: existingCredits + newCredits,
  };
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
      semesterId: academicSemesters.id,
      programYear: studentSemesterMappings.programYear,
      programSemester: studentSemesterMappings.programSemester,
    })
    .from(academicSemesters)
    .leftJoin(
      studentSemesterMappings,
      and(
        eq(studentSemesterMappings.academicSemesterId, academicSemesters.id),
        eq(studentSemesterMappings.studentId, studentId)
      )
    )
    .where(
      sql`academic_semesters.id = ANY(${plannedCourses.map((c) => c.semesterId)})`
    );

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
 * Helper function to generate course info messages for UI tooltips
 */
function generateCourseInfoMessage(course: any): string {
  if (course.grade === null) {
    return "Planned course";
  }

  if (course.retakeNeeded) {
    return `Failed with ${course.grade}. Minimum required: ${course.minimumGradeRequired}. Retake required.`;
  }

  if (course.voluntaryRetakePossible) {
    return `Passed with ${course.grade}. You can retake to improve your grade.`;
  }

  if (course.passed) {
    return `Successfully completed with grade ${course.grade}`;
  }

  if (course.totalAttempts > 1) {
    return `Course attempted ${course.totalAttempts} times. Latest grade: ${course.grade}`;
  }

  return course.courseDescription || "Course information";
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
 * Adds a student semester mapping if it doesn't already exist
 * @param studentId The student ID
 * @param cohortYear The student's cohort year (graduation year)
 * @param programYear The program year (1-4)
 * @param programSemester The semester number within the year (1-2, null for summer)
 * @param isSummer Whether this is a summer semester
 * @returns The student semester mapping record (existing or newly created)
 */
export async function addStudentSemesterMappingIfNotExists(
  studentId: string,
  cohortYear: number,
  programYear: number,
  programSemester: number,
  isSummer: boolean
): Promise<StudentSemesterMappingRecord | null> {
  // Calculate academic year based on cohort year and program year
  const baseYear = cohortYear - 4; // Year student started
  const startYear = baseYear + programYear - 1;
  const academicYearName = `${startYear}-${startYear + 1}`;

  // Determine sequence number (1, 2, or 3 for summer)
  const sequenceNumber = isSummer ? 3 : programSemester || 1;

  // Find the academic semester
  const semester = await db.query.academicSemesters.findFirst({
    where: and(
      eq(academicSemesters.academicYearName, academicYearName),
      eq(academicSemesters.sequenceNumber, sequenceNumber)
    ),
  });

  if (!semester) {
    console.error(
      `Academic semester not found for ${academicYearName}, sequence ${sequenceNumber}`
    );
    return null;
  }

  // Check if mapping already exists
  const existingMapping = await db.query.studentSemesterMappings.findFirst({
    where: and(
      eq(studentSemesterMappings.studentId, studentId),
      eq(studentSemesterMappings.academicSemesterId, semester.id),
      eq(studentSemesterMappings.programYear, programYear),
      eq(studentSemesterMappings.programSemester, programSemester),
      eq(studentSemesterMappings.isSummer, isSummer)
    ),
  });

  if (existingMapping) {
    return existingMapping;
  }

  // Insert new mapping
  const [newMapping] = await db
    .insert(studentSemesterMappings)
    .values({
      studentId,
      academicSemesterId: semester.id,
      programYear,
      programSemester,
      isSummer,
      isVerified: false,
    })
    .returning();

  return newMapping;
}
