"use server";

// src/lib/academic-plan/academic-plan-actions.ts
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  StudentCourseStatusRecord,
  academicSemesters,
  authUsers,
  courses,
  prerequisiteCourses,
  prerequisiteGroups,
  studentCourseCategorizedStatusView,
  studentCourseStatusView,
  studentCourses,
  studentDegreeRequirementProgressView,
  studentProfiles,
  studentRemainingRequirementsView,
  studentRequiredCoursesView,
  studentSemesterMappings,
} from "@/drizzle/schema";
import { StudentProfileRecord } from "@/drizzle/schema/student-records/student-profiles";
import { StudentSemesterMappingRecord } from "@/drizzle/schema/student-records/student-semester-mappings";
import { AppError } from "@/lib/errors/app-error-classes";
import { serializeError } from "@/lib/errors/error-converter";
import { ActionResponse } from "@/lib/types/common";

import {
  CourseAvailability,
  CoursePlacementValidationResponse,
  CourseWithStatus,
  ElectivePlaceholder,
  PlacementSummary,
  PrerequisiteCheckResult,
  Semester,
  SemesterAvailableCourses,
  SemesterCreditsResponse,
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
 * Helper function to get the student ID from auth ID
 */
async function getStudentIdFromAuthId(authId: string): Promise<string> {
  const user = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.authId, authId),
    columns: { studentId: true },
  });

  if (!user || !user.studentId) {
    throw new AppError({
      message: `No student record associated with this user account`,
      code: "AUTH_ERROR",
    });
  }

  return user.studentId;
}

/**
 * Get student's academic plan
 * Now accepts authId directly from the auth store
 */
export async function getStudentAcademicPlan(
  authId: string
): Promise<ActionResponse<YearPlan>> {
  try {
    // 1. Get student profile information
    const profileData: StudentProfileRecord | undefined =
      await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.authId, authId),
      });

    if (!profileData) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: `Student not found: ${authId}`,
            code: "STUDENT_NOT_FOUND",
          })
        ),
      };
    }

    // 2. Get all student courses with statuses from the view
    const coursesWithStatus = await db
      .select()
      .from(studentCourseStatusView)
      .where(eq(studentCourseStatusView.authId, authId));

    // 4. Get progress information by category
    const progressByCategory = await db
      .select()
      .from(studentDegreeRequirementProgressView)
      .where(eq(studentDegreeRequirementProgressView.authId, authId));

    // 5. Initialize empty plan structure
    const plan: YearPlan = {
      studentId: profileData.studentId!,
      majorCode: profileData.majorCode || "",
      mathTrack: profileData.mathTrackName || undefined,
      capstoneOption: profileData.capstoneOptionName || undefined,
      currentYear: profileData.currentYear || 1,
      currentSemester: profileData.currentSemester
        ? parseInt(profileData.currentSemester, 10)
        : 1,
      years: {},
      totalCreditsCompleted: 0,
      totalCreditsRemaining: 0,
      percentageComplete: 0,
      lastUpdated: new Date(),
    };
    // In year-by-year-plan-view.tsx
    console.log("\n\n\nPlan data:", JSON.stringify(plan, null, 2));

    // Initialize all years and semesters
    for (let year = 1; year <= 5; year++) {
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
      let targetSemester: Semester | undefined;
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
        credits: course.credits ? parseFloat(course.credits.toString()) : 1,
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
        isPlaceholder: false,
      };

      // Add to appropriate semester
      if (targetSemester) {
        targetSemester.courses.push(courseWithStatus);

        // Initialize totalCredits if undefined
        if (targetSemester.totalCredits === undefined) {
          targetSemester.totalCredits = 0;
        }
        // Add credits to semester total
        targetSemester.totalCredits += courseWithStatus.credits;
      }
    }

    // 8. Add warning for semesters with too many credits
    for (let year = 1; year <= 8; year++) {
      if (!plan.years[year]) continue;

      const yearObj = plan.years[year];
      yearObj.fall.hasCreditWarning =
        yearObj.fall.totalCredits > MAX_CREDITS_PER_SEMESTER;
      yearObj.spring.hasCreditWarning =
        yearObj.spring.totalCredits > MAX_CREDITS_PER_SEMESTER;
      // No warning for summer
    }

    // 9. Calculate overall progress statistics
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
    // In year-by-year-plan-view.tsx
    console.log("\n\nPlan data Comp:", JSON.stringify(plan, null, 2));
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
 * Helper function to get total credits in a semester
 * Used by multiple functions for credit load validation
 */
async function getSemesterTotalCredits(
  authId: string,
  year: number,
  semester: number
): Promise<number> {
  // Get courses from the view (real courses)
  const semesterCourses = await db
    .select({
      credits: studentCourseStatusView.credits,
    })
    .from(studentCourseStatusView)
    .where(
      and(
        eq(studentCourseStatusView.authId, authId),
        eq(studentCourseStatusView.yearTaken, year),
        eq(studentCourseStatusView.semesterTaken, semester)
      )
    );

  // Get placeholders (which might not be in the view)
  const semesterPlaceholders = await db
    .select({
      credits: studentCourses.placeholderCredits,
    })
    .from(studentCourses)
    .leftJoin(
      studentSemesterMappings,
      eq(studentCourses.semesterId, studentSemesterMappings.academicSemesterId)
    )
    .where(
      and(
        eq(studentCourses.authId, authId),
        eq(studentCourses.status, "planned"),
        isNull(studentCourses.courseCode),
        eq(studentSemesterMappings.programYear, year),
        eq(studentSemesterMappings.programSemester, semester)
      )
    );

  // Calculate total credits
  const realCourseCredits = semesterCourses.reduce(
    (sum, course) => sum + parseFloat(course.credits?.toString() || "0"),
    0
  );

  const placeholderCredits = semesterPlaceholders.reduce(
    (sum, course) => sum + parseFloat(course.credits?.toString() || "0"),
    0
  );

  return realCourseCredits + placeholderCredits;
}

/**
 * Validates course placement in a specific semester
 * Centralizes validation logic used by multiple course planning functions
 */
async function validateCoursePlacement(
  authId: string,
  courseCode: string,
  year: number,
  semester: number
): Promise<CoursePlacementValidationResponse> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Get student profile for validations
  const studentProfile = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.authId, authId),
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
    studentProfile.studentId!,
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
  const existingCredits = await getSemesterTotalCredits(authId, year, semester);
  const courseInfo = await db.query.courses.findFirst({
    where: eq(courses.code, courseCode),
    columns: { credits: true },
  });
  const newCredits = courseInfo ? parseFloat(courseInfo.credits.toString()) : 0;
  const totalCredits = existingCredits + newCredits;

  if (totalCredits > MAX_CREDITS_PER_SEMESTER) {
    warnings.push(
      `This will exceed the recommended credit limit of ${MAX_CREDITS_PER_SEMESTER} credits per semester. Current: ${existingCredits}, New: ${newCredits}, Total would be: ${totalCredits}`
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
      studentProfile.studentId!,
      authId,
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
 * Simpler validation for placeholder electives
 * Doesn't check prerequisites or course offerings
 */
async function validatePlaceholderPlacement(
  authId: string,
  credits: number,
  year: number,
  semester: number
): Promise<CoursePlacementValidationResponse> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Get student profile
  const studentProfile = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.authId, authId),
  });

  if (!studentProfile?.cohortYear) {
    return {
      isValid: false,
      errors: ["Student profile incomplete or missing"],
      warnings: [],
    };
  }

  // 2. Check credit load
  const existingCredits = await getSemesterTotalCredits(authId, year, semester);
  const totalCredits = existingCredits + credits;

  if (totalCredits > MAX_CREDITS_PER_SEMESTER) {
    warnings.push(
      `This will exceed the recommended credit limit of ${MAX_CREDITS_PER_SEMESTER} credits per semester. Current: ${existingCredits}, New: ${credits}, Total would be: ${totalCredits}`
    );
  }

  // 3. Check if exceeding max recommended years
  if (year > MAX_RECOMMENDED_YEARS) {
    warnings.push(
      `This extends your plan beyond the recommended ${MAX_RECOMMENDED_YEARS} years. Please consult with your academic advisor`
    );
  }

  // 4. Special warning for summer courses
  const isSummer = semester === 3;
  if (isSummer) {
    warnings.push(
      "Course offerings in summer semesters are not guaranteed and may change. Check with your advisor closer to the registration period"
    );
  }

  // 5. Create semester mapping
  const semesterMapping = await addStudentSemesterMappingIfNotExists(
    studentProfile.studentId!,
    authId,
    studentProfile.cohortYear,
    year,
    semester,
    isSummer
  );

  if (!semesterMapping) {
    errors.push("Could not find or create semester mapping");
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
  authId: string,
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
          eq(studentCourseStatusView.authId, authId),
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
      authId,
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
        authId,
        studentId: await getStudentIdFromAuthId(authId),
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
 * Add a placeholder elective to a student's academic plan
 */
export async function addPlaceholderElective(
  authId: string,
  title: string,
  credits: number,
  year: number,
  semester: number,
  category: string = "Non-Major Electives"
): Promise<ActionResponse<{ courseId: string }>> {
  try {
    // 1. Validate placeholder placement (simpler validation)
    const validation = await validatePlaceholderPlacement(
      authId,
      credits,
      year,
      semester
    );

    if (!validation.isValid) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: validation.errors[0],
            code: "PLACEHOLDER_ADD_ERROR",
            details: { errors: validation.errors },
          })
        ),
        warnings: validation.warnings,
      };
    }

    // 2. Add the placeholder
    const [newPlaceholder] = await db
      .insert(studentCourses)
      .values({
        authId,
        studentId: await getStudentIdFromAuthId(authId),
        courseCode: null, // No course code for placeholders
        semesterId: validation.semesterMapping!.academicSemesterId,
        status: "planned",
        placeholderTitle: title,
        placeholderCredits: credits.toString(),
        categoryName: category,
      })
      .returning();

    return {
      success: true,
      data: { courseId: newPlaceholder.id },
      warnings:
        validation.warnings.length > 0 ? validation.warnings : undefined,
    };
  } catch (error) {
    console.error("Error adding placeholder elective:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Move a planned course to a different semester
 * Works with both regular courses and placeholder electives
 */
export async function movePlannedCourse(
  authId: string,
  courseId: string,
  newYear: number,
  newSemester: number
): Promise<ActionResponse<void>> {
  try {
    // 1. Check if student course exists and is planned
    const courseRecord = await db.query.studentCourses.findFirst({
      where: and(
        eq(studentCourses.id, courseId),
        eq(studentCourses.authId, authId),
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

    // 2. Determine if this is a placeholder or a real course
    const isPlaceholder = !courseRecord.courseCode;

    // 3A. For placeholders, use simpler validation
    if (isPlaceholder) {
      const credits = courseRecord.placeholderCredits
        ? parseFloat(courseRecord.placeholderCredits.toString())
        : 1;

      const validation = await validatePlaceholderPlacement(
        authId,
        credits,
        newYear,
        newSemester
      );

      if (!validation.isValid) {
        return {
          success: false,
          error: serializeError(
            new AppError({
              message: validation.errors[0],
              code: "PLACEHOLDER_MOVE_ERROR",
              details: { errors: validation.errors },
            })
          ),
          warnings: validation.warnings,
        };
      }

      // Move the placeholder
      await db
        .update(studentCourses)
        .set({ semesterId: validation.semesterMapping!.academicSemesterId })
        .where(eq(studentCourses.id, courseId));

      return {
        success: true,
        warnings:
          validation.warnings.length > 0 ? validation.warnings : undefined,
      };
    }

    // 3B. For real courses, use full validation
    const validation = await validateCoursePlacement(
      authId,
      courseRecord.courseCode!,
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

    // 4. Move the course
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
 * Works with both regular courses and placeholder electives
 */
export async function removePlannedCourse(
  authId: string,
  courseId: string
): Promise<ActionResponse<void>> {
  const warnings: string[] = [];

  try {
    // 1. Check if student course exists and is planned
    const courseRecord = await db.query.studentCourses.findFirst({
      where: and(
        eq(studentCourses.id, courseId),
        eq(studentCourses.authId, authId),
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

    // 2. Check if course is required (only for real courses, not placeholders)
    if (courseRecord.courseCode) {
      const requiredCourses = await db
        .select()
        .from(studentRequiredCoursesView)
        .where(
          and(
            eq(studentRequiredCoursesView.authId, authId),
            eq(studentRequiredCoursesView.courseCode, courseRecord.courseCode)
          )
        );

      if (requiredCourses.length > 0) {
        warnings.push(
          "This is a required course for your degree. You will need to plan it in a future semester to meet graduation requirements"
        );
      }
    } else {
      // For placeholders, check if student needs more electives
      const electiveRequirements = await db
        .select()
        .from(studentRemainingRequirementsView)
        .where(
          and(
            eq(studentRemainingRequirementsView.authId, authId),
            isNull(studentRemainingRequirementsView.courseCode),
            eq(
              studentRemainingRequirementsView.requirementType,
              "elective_placeholder"
            )
          )
        );

      if (electiveRequirements.length > 0) {
        warnings.push(
          "You still need to complete elective credits for your degree. You may need to add electives back to your plan."
        );
      }
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
  authId: string,
  year: number,
  semester: number
): Promise<ActionResponse<SemesterAvailableCourses>> {
  try {
    // 1. Get student profile
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, authId),
    });

    if (!profile) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: `Student not found: ${authId}`,
            code: "STUDENT_NOT_FOUND",
          })
        ),
      };
    }

    // 2. Get all courses the student has already passed from the view
    const passedCourses = await db
      .select({
        courseCode: studentCourseCategorizedStatusView.courseCode,
      })
      .from(studentCourseCategorizedStatusView)
      .where(
        and(
          eq(studentCourseCategorizedStatusView.authId, authId),
          eq(studentCourseCategorizedStatusView.passed, true)
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
          eq(studentRequiredCoursesView.authId, authId),
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
        authId,
        course.courseCode,
        year,
        semester
      );

      // Only include courses with prerequisites met
      if (prerequisiteCheck.isMet) {
        const isOfferedInSemester = course.offeredInSemesters?.includes(
          semesterType as any
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
 * Get available elective categories for placeholders
 */
export async function getAvailableElectiveCategories(
  authId: string
): Promise<ActionResponse<string[]>> {
  try {
    // Get remaining elective requirements
    const electiveRequirements = await db
      .select({
        category: studentRemainingRequirementsView.categoryName,
        subCategory: studentRemainingRequirementsView.subCategory,
      })
      .from(studentRemainingRequirementsView)
      .where(
        and(
          eq(studentRemainingRequirementsView.authId, authId),
          isNull(studentRemainingRequirementsView.courseCode),
          eq(
            studentRemainingRequirementsView.requirementType,
            "elective_placeholder"
          )
        )
      );

    // Extract unique categories
    const categories = new Set<string>();

    for (const req of electiveRequirements) {
      if (req.subCategory) {
        categories.add(req.subCategory);
      } else if (req.category) {
        categories.add(req.category);
      }
    }

    // Always include Non-Major Electives as a default
    categories.add("Non-Major Electives");

    return {
      success: true,
      data: Array.from(categories),
    };
  } catch (error) {
    console.error("Error getting elective categories:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Check if prerequisites are met for a course in a specific semester
 */
export async function checkPrerequisitesMet(
  authId: string,
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
      courseCode: studentCourseCategorizedStatusView.courseCode,
      passed: studentCourseCategorizedStatusView.passed,
      year: studentCourseCategorizedStatusView.yearTaken,
      semester: studentCourseCategorizedStatusView.semesterTaken,
    })
    .from(studentCourseCategorizedStatusView)
    .where(
      and(
        eq(studentCourseCategorizedStatusView.authId, authId),
        eq(studentCourseCategorizedStatusView.passed, true)
      )
    );

  // 3. Get planned courses
  const plannedCourses = await db
    .select({
      courseCode: studentCourses.courseCode,
      semesterId: studentCourses.semesterId,
      authId: studentCourses.authId,
    })
    .from(studentCourses)
    .where(
      and(
        eq(studentCourses.authId, authId),
        eq(studentCourses.status, "planned"),
        // Only include non-placeholder courses
        sql`course_code IS NOT NULL`
      )
    );

  // 4. Get semester mappings for planned courses
  const semesterIds = plannedCourses.map((c) => c.semesterId);

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
        eq(studentSemesterMappings.authId, authId)
      )
    )
    .where(
      sql`${academicSemesters.id} = ANY(${sql.placeholder("semesterIds")})`
    )
    .execute({ semesterIds });

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
 * Helper function to check course availability by offering pattern
 */
async function checkCourseAvailability(
  courseCode: string,
  programSemester: number,
  isSummer: boolean
): Promise<CourseAvailability> {
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
  authId: string,
  year: number,
  semester: number,
  additionalCourseCode?: string
): Promise<SemesterCreditsResponse> {
  // Get existing credits
  const existingCredits = await getSemesterTotalCredits(authId, year, semester);

  // Calculate new credits if adding a course
  let newCredits = 0;
  if (additionalCourseCode) {
    const course = await db.query.courses.findFirst({
      where: eq(courses.code, additionalCourseCode),
      columns: { credits: true },
    });
    newCredits = course ? parseFloat(course.credits.toString()) : 0;
  }

  return {
    existing: existingCredits,
    new: newCredits,
    total: existingCredits + newCredits,
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
 * Helper function to get semester name
 */
function getSemesterName(semester: number, isSummer: boolean): string {
  if (isSummer) return "Summer";
  if (semester === 1) return "Fall";
  if (semester === 2) return "Spring";
  return "Unknown";
}

/**
 * Adds a student semester mapping if it doesn't already exist
 */
export async function addStudentSemesterMappingIfNotExists(
  studentId: string,
  authId: string,
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
      authId: authId,
      academicSemesterId: semester.id,
      programYear,
      programSemester,
      isSummer,
      isVerified: false,
    })
    .returning();

  return newMapping;
}

/**
 * Generate an automatic plan for a student
 */
export async function generateAutomaticPlan(
  authId: string,
  options?: {
    startYear?: number;
    startSemester?: number;
    balanceCredits?: boolean;
  }
): Promise<ActionResponse<YearPlan>> {
  try {
    // Get student profile
    const studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, authId),
    });

    if (!studentProfile || !studentProfile.studentId) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Student profile not found",
            code: "STUDENT_NOT_FOUND",
          })
        ),
      };
    }

    // 1. Determine starting point for planning
    const currentYear = options?.startYear || studentProfile.currentYear || 1;
    const currentSemester =
      options?.startSemester ||
      (studentProfile.currentSemester
        ? parseInt(studentProfile.currentSemester, 10)
        : 1);

    // 2. Clear any existing planned courses (keep completed/failed courses)
    await db
      .delete(studentCourses)
      .where(
        and(
          eq(studentCourses.authId, authId),
          eq(studentCourses.status, "planned")
        )
      );

    // 3. Get remaining requirements from the specialized view
    const remainingRequirements = await db
      .select()
      .from(studentRemainingRequirementsView)
      .where(eq(studentRemainingRequirementsView.authId, authId));

    // 4. Gather prerequisite information for all courses
    const prerequisiteMap = await buildPrerequisiteMap(
      authId,
      remainingRequirements
    );

    // 5. Process and organize courses for placement
    const coursesForPlacement = organizeCoursesForPlacement(
      remainingRequirements,
      prerequisiteMap
    );

    // 6. Place courses semester by semester
    const planSummary = await placeCourses(
      authId,
      studentProfile.studentId,
      studentProfile.cohortYear || new Date().getFullYear() + 4, // Default graduation year
      coursesForPlacement,
      prerequisiteMap,
      currentYear,
      currentSemester,
      options?.balanceCredits ?? true
    );

    // 7. Return the updated plan with placement summary
    const plan = (await getStudentAcademicPlan(authId)).data!;

    return {
      success: true,
      data: plan,
      message: generateSummaryMessage(planSummary),
    };
  } catch (error) {
    console.error("Error generating automatic plan:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

// Helper function to build prerequisite map
async function buildPrerequisiteMap(
  authId: string,
  remainingRequirements: any[]
): Promise<Map<string, string[]>> {
  const prereqMap = new Map<string, string[]>();
  const coursesToPlace = remainingRequirements
    .filter((req) => req.course_code) // Only courses with actual codes (not placeholders)
    .map((req) => req.course_code);

  // Get all prerequisite groups for these courses
  const prereqGroups = await db
    .select()
    .from(prerequisiteGroups)
    .where(inArray(prerequisiteGroups.courseCode, coursesToPlace));
  // Get completed courses to exclude them from prerequisites
  const completedCourses = await db
    .select({
      courseCode: studentCourseCategorizedStatusView.courseCode,
    })
    .from(studentCourseCategorizedStatusView)
    .where(
      and(
        eq(studentCourseCategorizedStatusView.authId, authId),
        eq(studentCourseCategorizedStatusView.passed, true),
        eq(studentCourseCategorizedStatusView.isLatestAttempt, true)
      )
    );

  const completedCourseCodes = new Set(
    completedCourses.map((c) => c.courseCode)
  );

  // Process each course for prerequisites
  for (const courseCode of coursesToPlace) {
    const prereqsNeeded: string[] = [];

    // Find all prerequisite groups for this course
    const groupsForCourse = prereqGroups.filter(
      (group) =>
        group.courseCode === courseCode &&
        !group.isConcurrent &&
        !group.isRecommended
    );

    // For each group
    for (const group of groupsForCourse) {
      // Get all courses in this prerequisite group
      const prereqCourses = await db
        .select({
          prereqCourseCode: prerequisiteCourses.prerequisiteCourseCode,
        })
        .from(prerequisiteCourses)
        .where(eq(prerequisiteCourses.groupKey, group.groupKey));

      // Filter out already completed prerequisites
      const activePrereqs = prereqCourses
        .filter((p) => !completedCourseCodes.has(p.prereqCourseCode))
        .map((p) => p.prereqCourseCode);

      // Handle the logic operator (AND/OR)
      if (activePrereqs.length > 0) {
        if (group.internalLogicOperator === "AND") {
          // All courses in group are required
          activePrereqs.forEach((p) => prereqsNeeded.push(p));
        } else {
          // OR logic - just need one, so add the first one
          // (ideally we'd choose the best one, but for now just take the first)
          if (activePrereqs.length > 0) {
            prereqsNeeded.push(activePrereqs[0]);
          }
        }
      }
    }

    // Store prerequisites for this course
    prereqMap.set(courseCode, prereqsNeeded);
  }

  return prereqMap;
}

// Organize courses for placement by priority and prerequisites
function organizeCoursesForPlacement(
  remainingRequirements: any[],
  prerequisiteMap: Map<string, string[]>
): any[] {
  // First, separate by requirement type
  const retakeCourses = remainingRequirements.filter(
    (req) => req.requirement_type === "retake_required"
  );

  const requiredCourses = remainingRequirements.filter(
    (req) => req.requirement_type === "required_course"
  );

  const electivePlaceholders = remainingRequirements.filter(
    (req) => req.requirement_type === "elective_placeholder"
  );

  // For required courses, perform topological sort based on prerequisites
  const sortedRequired = topologicalSortCourses(
    requiredCourses,
    prerequisiteMap
  );

  // Return in priority order
  return [
    ...retakeCourses, // Highest priority: retakes
    ...sortedRequired, // Second priority: required courses in dependency order
    ...electivePlaceholders, // Lowest priority: elective placeholders
  ];
}

// Perform topological sort on courses based on prerequisites
function topologicalSortCourses(
  courses: any[],
  prerequisiteMap: Map<string, string[]>
): any[] {
  const result: any[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  // Build an adjacency map of course codes to course objects
  const courseMap = new Map<string, any>();
  courses.forEach((course) => {
    if (course.course_code) {
      courseMap.set(course.course_code, course);
    }
  });

  // Recursive DFS function for topological sort
  function visit(courseCode: string) {
    // Skip if already processed
    if (visited.has(courseCode)) return;

    // Check for cycles (this shouldn't happen in a valid curriculum)
    if (temp.has(courseCode)) {
      console.warn(
        `Cycle detected in course prerequisites involving ${courseCode}`
      );
      return;
    }

    // Mark as temporarily visited
    temp.add(courseCode);

    // Visit all prerequisites first
    const prereqs = prerequisiteMap.get(courseCode) || [];
    for (const prereq of prereqs) {
      if (courseMap.has(prereq)) {
        visit(prereq);
      }
    }

    // Mark as visited and add to result
    temp.delete(courseCode);
    visited.add(courseCode);

    // Add the actual course object to the result
    const course = courseMap.get(courseCode);
    if (course) {
      result.push(course);
    }
  }

  // Try to visit each course
  for (const course of courses) {
    if (course.course_code && !visited.has(course.course_code)) {
      visit(course.course_code);
    }
  }

  return result;
}

// Place courses into semesters
async function placeCourses(
  authId: string,
  studentId: string,
  cohortYear: number,
  coursesForPlacement: any[],
  prerequisiteMap: Map<string, string[]>,
  startYear: number,
  startSemester: number,
  balanceCredits: boolean
): Promise<PlacementSummary> {
  // Track what we've placed for returning a summary
  const placementSummary: PlacementSummary = {
    totalPlaced: 0,
    retakesPlaced: 0,
    requiredPlaced: 0,
    electivesPlaced: 0,
    semesterPlacements: {},
    unplacedCourses: [],
  };

  // Track semester credit loads
  const semesterCredits: Record<string, number> = {};

  // Track which courses have been placed
  const placedCourses = new Set<string>();

  // Track which prerequisites have been placed and where
  const prerequisitePlacements: Record<
    string,
    { year: number; semester: number }
  > = {};

  // Start with current semester
  let currentYear = startYear;
  let currentSemester = startSemester;

  // Helper to advance to next non-summer semester
  function advanceSemester() {
    if (currentSemester === 1) {
      // Fall -> Spring
      currentSemester = 2;
    } else {
      // Spring -> Fall of next year (skip summer)
      currentSemester = 1;
      currentYear++;
    }
  }

  // Helper to get semester key for tracking
  function getSemesterKey(year: number, semester: number) {
    return `${year}-${semester}`;
  }

  // Check if prerequisites are satisfied by previous placements
  function prerequisitesMet(
    courseCode: string,
    year: number,
    semester: number
  ): boolean {
    const prereqs = prerequisiteMap.get(courseCode) || [];

    // If no prerequisites, return true
    if (prereqs.length === 0) return true;

    // Check each prerequisite
    for (const prereq of prereqs) {
      // If prerequisite hasn't been placed yet, can't place this course
      if (!placedCourses.has(prereq)) return false;

      // Check the semester the prerequisite was placed in
      const prereqPlacement = prerequisitePlacements[prereq];
      if (!prereqPlacement) return false;

      // Prerequisite must come before this course
      if (prereqPlacement.year > year) return false;
      if (prereqPlacement.year === year && prereqPlacement.semester >= semester)
        return false;
    }

    return true;
  }

  // Check if course is offered in a semester
  function isOfferedInSemester(course: any, semester: number): boolean {
    // If no offering info, assume it's offered in all regular semesters
    if (
      !course.offered_in_semesters ||
      course.offered_in_semesters.length === 0
    ) {
      return true;
    }

    const semesterName = semester === 1 ? "fall" : "spring";
    return course.offered_in_semesters.includes(semesterName);
  }

  // Process each course for placement
  for (const course of coursesForPlacement) {
    // For courses with real course codes
    if (course.course_code) {
      let placed = false;
      let placeYear = currentYear;
      let placeSemester = currentSemester;

      const isRetake = course.requirement_type === "retake_required";

      // If not a retake and has recommended placement, try to use that
      if (!isRetake && course.recommended_year && course.recommended_semester) {
        // Only use recommendation if it's in the future from our current position
        const recommendedIsAfterCurrent =
          course.recommended_year > currentYear ||
          (course.recommended_year === currentYear &&
            course.recommended_semester >= currentSemester);

        if (recommendedIsAfterCurrent) {
          placeYear = course.recommended_year;
          placeSemester = course.recommended_semester;
        }
      }

      // Try to place the course
      while (!placed && placeYear <= 8) {
        // Skip if not offered in this semester
        if (!isOfferedInSemester(course, placeSemester)) {
          advanceSemester();
          if (placeSemester === 1) {
            // We advanced to a new year
            placeYear++;
          }
          continue;
        }

        // Check prerequisites
        if (!prerequisitesMet(course.course_code, placeYear, placeSemester)) {
          advanceSemester();
          if (placeSemester === 1) {
            placeYear++;
          }
          continue;
        }

        // Check credit load if balancing
        const semKey = getSemesterKey(placeYear, placeSemester);
        const currentCredits = semesterCredits[semKey] || 0;
        const courseCredits = parseFloat(course.credits?.toString() || "1");

        // If adding would exceed limit and we're balancing loads, and it's not a retake
        if (currentCredits + courseCredits > 5 && balanceCredits && !isRetake) {
          advanceSemester();
          if (placeSemester === 1) {
            placeYear++;
          }
          continue;
        }

        // We can place the course here
        try {
          // Create semester mapping if needed
          const semesterMapping = await addStudentSemesterMappingIfNotExists(
            studentId,
            authId,
            cohortYear,
            placeYear,
            placeSemester,
            false // Not summer
          );

          if (!semesterMapping) {
            console.error(
              `Failed to create semester mapping for ${placeYear}-${placeSemester}`
            );
            advanceSemester();
            continue;
          }

          // Add course to plan
          await db.insert(studentCourses).values({
            studentId,
            authId,
            courseCode: course.course_code,
            semesterId: semesterMapping.academicSemesterId,
            status: "planned",
          });

          // Update our tracking
          placedCourses.add(course.course_code);
          prerequisitePlacements[course.course_code] = {
            year: placeYear,
            semester: placeSemester,
          };

          // Update credit count
          semesterCredits[semKey] =
            (semesterCredits[semKey] || 0) + courseCredits;

          // Update placement summary
          placementSummary.totalPlaced++;
          if (isRetake) {
            placementSummary.retakesPlaced++;
          } else {
            placementSummary.requiredPlaced++;
          }

          // Add to semester placement summary
          if (!placementSummary.semesterPlacements[semKey]) {
            placementSummary.semesterPlacements[semKey] = {
              year: placeYear,
              semester: placeSemester,
              semesterName: placeSemester === 1 ? "Fall" : "Spring",
              credits: 0,
              courses: [],
            };
          }

          placementSummary.semesterPlacements[semKey].credits += courseCredits;
          placementSummary.semesterPlacements[semKey].courses.push({
            code: course.course_code,
            title: course.course_title,
            credits: courseCredits,
            type: isRetake ? "Retake" : "Required",
          });

          placed = true;

          // If this was a retake, we need to advance semester for the next placement
          if (isRetake) {
            advanceSemester();
          }
        } catch (error) {
          console.error(`Failed to place course ${course.course_code}:`, error);
          advanceSemester();
        }
      }

      // If we couldn't place even after trying all semesters up to year 8
      if (!placed) {
        console.warn(
          `Could not place course ${course.course_code} within 8 years`
        );
        placementSummary.unplacedCourses.push({
          code: course.course_code,
          title: course.course_title,
          reason: "Could not find a suitable semester within 8 years",
        });
      }
    }
    // For elective placeholders
    else if (course.requirement_type === "elective_placeholder") {
      // For elective placeholders, we'll try to place them evenly starting from year 2
      let placeYear = Math.max(currentYear, 2);
      let placeSemester = 1; // Start with Fall
      let placed = false;

      // Get elective credits
      const electiveCredits = parseFloat(course.credits?.toString() || "1");

      // Find the least loaded semester to place this elective
      while (!placed && placeYear <= 8) {
        // Try both semesters in the current year
        for (let sem = 1; sem <= 2; sem++) {
          const semKey = getSemesterKey(placeYear, sem);
          const currentCredits = semesterCredits[semKey] || 0;

          // If this semester has space, use it
          if (currentCredits + electiveCredits <= 5 || !balanceCredits) {
            try {
              // Create semester mapping
              const semesterMapping =
                await addStudentSemesterMappingIfNotExists(
                  studentId,
                  authId,
                  cohortYear,
                  placeYear,
                  sem,
                  false // Not summer
                );

              if (!semesterMapping) {
                console.error(
                  `Failed to create semester mapping for ${placeYear}-${sem}`
                );
                continue;
              }

              // Add placeholder course to plan with placeholder name
              await db.insert(studentCourses).values({
                studentId,
                authId,
                courseCode: null, // No real course code for placeholder
                semesterId: semesterMapping.academicSemesterId,
                status: "planned",
                placeholderTitle: course.course_title,
                placeholderCredits: electiveCredits.toString(),
                categoryName: course.category_name,
              });

              // Update credit count
              semesterCredits[semKey] =
                (semesterCredits[semKey] || 0) + electiveCredits;

              // Update placement summary
              placementSummary.totalPlaced++;
              placementSummary.electivesPlaced++;

              // Add to semester placement summary
              if (!placementSummary.semesterPlacements[semKey]) {
                placementSummary.semesterPlacements[semKey] = {
                  year: placeYear,
                  semester: sem,
                  semesterName: sem === 1 ? "Fall" : "Spring",
                  credits: 0,
                  courses: [],
                };
              }

              placementSummary.semesterPlacements[semKey].credits +=
                electiveCredits;
              placementSummary.semesterPlacements[semKey].courses.push({
                code: null,
                title: course.course_title,
                credits: electiveCredits,
                type: "Elective",
              });

              placed = true;
              break;
            } catch (error) {
              console.error(`Failed to place elective placeholder`, error);
            }
          }
        }

        // If not placed in this year, try next year
        if (!placed) {
          placeYear++;
        }
      }

      // If we couldn't place the elective
      if (!placed) {
        console.warn(
          `Could not place elective ${course.course_title} within 8 years`
        );
        placementSummary.unplacedCourses.push({
          title: course.course_title,
          reason: "Could not find a suitable semester for this elective",
        });
      }
    }
  }

  return placementSummary;
}

// Generate a human-readable summary of what was placed
function generateSummaryMessage(summary: PlacementSummary): string {
  // Count how many semesters
  const semesterCount = Object.keys(summary.semesterPlacements).length;

  // Basic summary
  let message = `Successfully added ${summary.totalPlaced} courses to your plan across ${semesterCount} semesters.`;

  // Add details about types
  if (summary.retakesPlaced > 0) {
    message += ` ${summary.retakesPlaced} are courses you need to retake.`;
  }

  if (summary.electivesPlaced > 0) {
    message += ` ${summary.electivesPlaced} are elective placeholders that you'll need to replace with actual courses.`;
  }

  // Add unplaced warning if any
  if (summary.unplacedCourses.length > 0) {
    message += ` ${summary.unplacedCourses.length} required courses could not be placed - you may need to adjust your plan manually.`;
  }

  return message;
}
