"use server";

// src/lib/academic-plan/academic-plan-actions.ts
import { and, asc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  academicSemesters,
  courses,
  prerequisiteCourses,
  prerequisiteGroups,
  studentCourseCategorizedStatusView,
  studentCourses,
  studentDegreeRequirementProgressView,
  studentProfiles,
  studentRemainingRequirementsView,
  studentSemesterMappings,
} from "@/drizzle/schema";
import { PrerequisiteGroupRecord } from "@/drizzle/schema/curriculum/prerequisite-groups";
import { StudentSemesterMappingRecord } from "@/drizzle/schema/student-records/student-semester-mappings";
import { getStudentProfileCached } from "@/lib/academic-plan/cache-utils";
import { CATEGORY_COLORS, YEAR_LIMITS } from "@/lib/academic-plan/constants";
import { AppError } from "@/lib/errors/app-error-classes";
import { serializeError } from "@/lib/errors/error-converter";
import { ActionResponse } from "@/lib/types/common";

import {
  checkPrerequisites,
  getAvailableCourses,
  loadAllPrerequisiteData,
} from "./prerequisite-utility";
import { getCreditLimit } from "./transaction-utils";
import {
  CourseAvailability,
  CoursePlacementValidationResponse,
  CourseWithStatus,
  PlacementSummary,
  PrerequisiteCheckResult,
  RemainingRequirement,
  RemainingRequirementSummary,
  Semester,
  SemesterAvailableCourses,
  SemesterCreditsResponse,
  YearPlan,
} from "./types";

// Add this cache at the top level of your file (outside any functions)
const hasCoursesAboveMaxYearCache = new Map<string, boolean>();

// Efficient function to check if student has courses above YEAR_LIMITS.RECOMMENDED_MAX
async function hasCoursesAboveMaxYear(authId: string): Promise<boolean> {
  // Check cache first
  if (hasCoursesAboveMaxYearCache.has(authId)) {
    return hasCoursesAboveMaxYearCache.get(authId)!;
  }

  // If not in cache, query the database
  const result = await db
    .select({ count: sql`count(*)` })
    .from(studentCourseCategorizedStatusView)
    .where(
      and(
        eq(studentCourseCategorizedStatusView.authId, authId),
        sql`year_taken > ${YEAR_LIMITS.RECOMMENDED_MAX}`
      )
    )
    .limit(1);

  const hasCoursesAbove = result.length > 0 && Number(result[0].count) > 0;

  // Cache the result
  hasCoursesAboveMaxYearCache.set(authId, hasCoursesAbove);

  return hasCoursesAbove;
}

// /**
//  * Helper function to get the student ID from auth ID
//  */
// async function getStudentIdFromAuthId(authId: string): Promise<string> {
//   const user = await db.query.studentProfiles.findFirst({
//     where: eq(studentProfiles.authId, authId),
//     columns: { studentId: true },
//   });
//
//   if (!user || !user.studentId) {
//     throw new AppError({
//       message: `No student record associated with this user account`,
//       code: "AUTH_ERROR",
//     });
//   }
//
//   return user.studentId;
// }

/**
 * Fetches the remaining requirements for a student
 */
export async function getStudentRemainingRequirements(
  authId: string
): Promise<ActionResponse<RemainingRequirementSummary>> {
  try {
    // Fetch all remaining requirements
    const requirements = await db
      .select()
      .from(studentRemainingRequirementsView)
      .where(eq(studentRemainingRequirementsView.authId, authId))
      .orderBy(studentRemainingRequirementsView.priorityOrder);

    if (!requirements || requirements.length === 0) {
      return {
        success: true,
        data: {
          totalRequirements: 0,
          totalCredits: 0,
          retakesNeeded: 0,
          categories: {},
          highPriorityRequirements: [],
          allRequirements: [],
        },
      };
    }

    // Transform the data for better consumption by the UI
    const formattedRequirements: RemainingRequirement[] = requirements.map(
      (req) => ({
        courseCode: req.courseCode || null,
        courseTitle: req.courseTitle || "Unknown Course",
        credits: parseFloat(req.credits?.toString() || "0"),
        parentCategory: req.parentCategory || "General",
        categoryName: req.categoryName || "Uncategorized",
        subCategory: req.subCategory || null,
        recommendedYear: req.recommendedYear || null,
        recommendedSemester: req.recommendedSemester || null,
        offeredInSemesters: req.offeredInSemesters || null,
        requirementType: req.requirementType || "required_course",
        priorityOrder: req.priorityOrder || 999,
        isRetake: req.requirementType === "retake_required",
      })
    );

    // Identify high-priority requirements (retakes, specific courses, etc.)
    const highPriorityRequirements = formattedRequirements.filter(
      (req) => req.isRetake || req.priorityOrder <= 10
    );

    // Calculate statistics and organize by category
    const categories: Record<
      string,
      {
        name: string;
        remainingCourses: number;
        remainingCredits: number;
        highPriority: RemainingRequirement[];
      }
    > = {};

    let totalCredits = 0;
    let retakesNeeded = 0;

    for (const req of formattedRequirements) {
      totalCredits += req.credits;

      if (req.isRetake) {
        retakesNeeded++;
      }

      // Use parent category as the key
      const categoryKey = req.parentCategory;

      if (!categories[categoryKey]) {
        categories[categoryKey] = {
          name: req.parentCategory,
          remainingCourses: 0,
          remainingCredits: 0,
          highPriority: [],
        };
      }

      categories[categoryKey].remainingCourses++;
      categories[categoryKey].remainingCredits += req.credits;

      if (req.isRetake || req.priorityOrder <= 10) {
        categories[categoryKey].highPriority.push(req);
      }
    }

    return {
      success: true,
      data: {
        totalRequirements: formattedRequirements.length,
        totalCredits,
        retakesNeeded,
        categories,
        highPriorityRequirements,
        allRequirements: formattedRequirements,
      },
    };
  } catch (error) {
    console.error("Error fetching remaining requirements:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}
/**
 * Get student's academic plan
 * Optimized to use a transaction and reduce the number of queries
 */
export async function getStudentAcademicPlan(
  authId: string
): Promise<ActionResponse<YearPlan>> {
  try {
    // Run all queries in a single transaction to reduce database roundtrips
    const result = await db.transaction(async (tx) => {
      // 1. Get student profile information
      const profileData = await getStudentProfileCached(authId, tx);

      if (!profileData) {
        throw new AppError({
          message: `Student not found: ${authId}`,
          code: "STUDENT_NOT_FOUND",
        });
      }

      // 2. Get all student courses with statuses from the view
      const coursesWithStatus = await tx
        .select()
        .from(studentCourseCategorizedStatusView)
        .where(eq(studentCourseCategorizedStatusView.authId, authId));

      // 4. Get progress information by category
      const progressByCategory = await tx
        .select()
        .from(studentDegreeRequirementProgressView)
        .where(eq(studentDegreeRequirementProgressView.authId, authId));

      return {
        profileData,
        coursesWithStatus,
        progressByCategory,
      };
    });

    // Build the plan from the transaction results
    const { profileData, coursesWithStatus, progressByCategory } = result;

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

    // Initialize all years and semesters
    for (let year = 1; year <= YEAR_LIMITS.ABSOLUTE_MAX; year++) {
      plan.years[year] = {
        fall: createEmptySemester(year, 1, "Fall"),
        spring: createEmptySemester(year, 2, "Spring"),
        summer: createEmptySemester(year, 3, "Summer", true),
      };
    }

    // 6. Populate with actual courses
    for (const course of coursesWithStatus) {
      // Skip if not latest attempt for completed/failed courses.
      // if (!course.isLatestAttempt && course.grade !== null) {
      //   continue;
      // }

      // Determine which semester this belongs to
      const year = course.yearTaken || 1;
      const isSummer = course.wasSummerSemester || false;
      const semester = isSummer ? 3 : course.semesterTaken || 1;

      // Ensure the year exists in the plan
      if (!plan.years[year]) {
        plan.years[year] = {
          fall: createEmptySemester(year, 1, "Fall"),
          spring: createEmptySemester(year, 2, "Spring"),
          summer: createEmptySemester(year, 3, "Summer", true),
        };
      }

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
      targetSemester.courses.push(courseWithStatus);
      targetSemester.totalCredits += courseWithStatus.credits;
    }

    // 8. Add warning for semesters with too many credits
    for (const yearNum in plan.years) {
      const yearObj = plan.years[parseInt(yearNum)];
      yearObj.fall.hasCreditWarning =
        yearObj.fall.totalCredits > getCreditLimit(profileData.majorCode);
      yearObj.spring.hasCreditWarning =
        yearObj.spring.totalCredits > getCreditLimit(profileData.majorCode);
      if (yearObj.summer) {
        yearObj.summer.hasCreditWarning =
          yearObj.summer.totalCredits >
          getCreditLimit(profileData.majorCode, true);
      }
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
 * Cached prerequisite data for faster repeated checks
 * This helps avoid multiple database queries for the same prerequisite data
 */
const prerequisiteCache = new Map<
  string,
  {
    groups: any[];
    coursesMap: Map<string, string[]>;
    timestamp: number;
  }
>();

/**
 * Optimized helper function to get total credits in a semester
 * Uses a single query instead of separate queries for courses and placeholders
 */
async function getSemesterTotalCredits(
  authId: string,
  year: number,
  semester: number
): Promise<number> {
  // Get all courses in this semester with a single query
  const results = await db.transaction(async (tx) => {
    // Get regular courses
    const regularCourses = await tx
      .select({
        credits: studentCourseCategorizedStatusView.credits,
      })
      .from(studentCourseCategorizedStatusView)
      .where(
        and(
          eq(studentCourseCategorizedStatusView.authId, authId),
          eq(studentCourseCategorizedStatusView.yearTaken, year),
          eq(studentCourseCategorizedStatusView.semesterTaken, semester)
        )
      );

    // Get placeholders
    const placeholders = await tx
      .select({
        credits: studentCourses.placeholderCredits,
      })
      .from(studentCourses)
      .leftJoin(
        studentSemesterMappings,
        eq(
          studentCourses.semesterId,
          studentSemesterMappings.academicSemesterId
        )
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

    return { regularCourses, placeholders };
  });

  // Calculate total credits
  const regularCredits = results.regularCourses.reduce(
    (sum: number, course: { credits: any }) =>
      sum + parseFloat(course.credits?.toString() || "0"),
    0
  );

  const placeholderCredits = results.placeholders.reduce(
    (sum: number, course: { credits: any }) =>
      sum + parseFloat(course.credits?.toString() || "0"),
    0
  );

  return regularCredits + placeholderCredits;
}

/**
 * Completely optimized prerequisite check
 * Uses cached data and performs fewer database queries
 */
/**
 * Check prerequisites using the centralized utility
 */
export async function checkPrerequisitesMet(
  authId: string,
  courseCode: string,
  year: number,
  semester: number
): Promise<PrerequisiteCheckResult> {
  // Get student profile to access the major code
  const studentProfile = await getStudentProfileCached(authId);

  const majorCode = studentProfile?.majorCode || undefined;

  // Get all prerequisite data from the centralized utility
  const prereqData = await loadAllPrerequisiteData();

  // Get available courses in a single query to avoid N+1 problem
  const { passedCourses, plannedCourses } = await db.transaction(async (tx) => {
    // Get passed courses
    const passed = await tx
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

    // Get planned courses with their semester information directly from the view
    const planned = await tx
      .select({
        courseCode: studentCourseCategorizedStatusView.courseCode,
        yearTaken: studentCourseCategorizedStatusView.yearTaken,
        semesterTaken: studentCourseCategorizedStatusView.semesterTaken,
        status: studentCourseCategorizedStatusView.status,
      })
      .from(studentCourseCategorizedStatusView)
      .where(
        and(
          eq(studentCourseCategorizedStatusView.authId, authId),
          eq(studentCourseCategorizedStatusView.status, "planned"),
          // Make sure courseCode is not null (exclude placeholders)
          sql`course_code IS NOT NULL`
        )
      );

    return {
      passedCourses: passed,
      plannedCourses: planned,
    };
  });

  // Create a set of passed courses
  const passedCourseSet = new Set(
    passedCourses.map((c) => c.courseCode).filter(Boolean)
  );

  // Convert planned courses to the expected format
  const plannedCoursesFormatted = plannedCourses
    .filter((c) => c.courseCode && c.yearTaken && c.semesterTaken)
    .map((c) => ({
      courseCode: c.courseCode!,
      year: c.yearTaken || 0,
      semester: c.semesterTaken || 0,
    }));

  // Get all available courses for this check
  const availableCourses = getAvailableCourses(
    passedCourseSet,
    plannedCoursesFormatted,
    year,
    semester
  );

  // Check prerequisites using the utility
  return checkPrerequisites(
    courseCode,
    availableCourses,
    prereqData,
    majorCode
  );
}

/**
 * Optimized validation that performs fewer queries by batching related checks
 */
/**
 * Validate course placement using the centralized prerequisite utility
 */
async function validateCoursePlacement(
  authId: string,
  courseCode: string,
  year: number,
  semester: number
): Promise<CoursePlacementValidationResponse> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isSummer = semester === 3;

  // Get all necessary data in a single transaction
  const result = await db.transaction(async (tx) => {
    // 1. Get student profile
    const profile = await getStudentProfileCached(authId, tx);

    if (!profile?.cohortYear) {
      return {
        profile: null,
        courseInfo: null,
        existingCredits: 0,
        semesterMapping: null,
      };
    }

    // 2. Get course information
    const courseInfo = await tx.query.courses.findFirst({
      where: eq(courses.code, courseCode),
      columns: { credits: true, offeredInSemesters: true, title: true },
    });

    // 3. Calculate existing credits
    const semesterCredits = await getSemesterCreditsInTransaction(
      tx,
      authId,
      year,
      semester
    );

    const semesterCreditLimit: number = getCreditLimit(
      profile.majorCode,
      isSummer
    );

    // 4. Create semester mapping if needed
    const semesterMapping = !errors.length
      ? await getOrCreateSemesterMapping(
          tx,
          profile.studentId!,
          authId,
          profile.cohortYear,
          year,
          semester,
          isSummer
        )
      : null;

    return {
      profile,
      courseInfo,
      existingCredits: semesterCredits,
      semesterMapping,
      semesterCreditLimit,
    };
  });

  // Handle missing profile error
  if (!result.profile) {
    return {
      isValid: false,
      errors: ["Student profile incomplete or missing"],
      warnings: [],
    };
  }

  // Check prerequisites using our centralized utility
  const prerequisiteCheck = await checkPrerequisitesMet(
    authId,
    courseCode,
    year,
    semester
  );

  if (!prerequisiteCheck.isMet) {
    // Get course title for the course being added
    const course = await db.query.courses.findFirst({
      where: eq(courses.code, courseCode),
      columns: { title: true },
    });

    const courseTitle = course?.title || "";
    // // Format enhanced error message
    const enhancedMessage = prerequisiteCheck.infoMessage;

    errors.push(
      prerequisiteCheck.infoMessage ||
        `${enhancedMessage} before taking ${courseCode} - ${courseTitle}`
    );
  }
  // Check course availability
  if (result.courseInfo) {
    const semesterType = isSummer
      ? "summer"
      : semester === 1
        ? "fall"
        : "spring";

    const isOffered = result.courseInfo.offeredInSemesters.includes(
      semesterType as "fall" | "spring" | "summer"
    );

    if (!isOffered) {
      warnings.push(
        `${result.courseInfo.title} is typically not offered in ${semesterType} semester. You may need to adjust your planning if this course isn't available`
      );
    }
  } else {
    warnings.push("Course information not found");
  }

  // Check credit load
  const newCredits = result.courseInfo
    ? parseFloat(result.courseInfo.credits.toString())
    : 0;
  const totalCredits = result.existingCredits + newCredits;
  const maxCredits = result.semesterCreditLimit || 5;

  if (totalCredits > maxCredits) {
    warnings.push(
      `This will exceed the recommended credit limit of ${maxCredits} credits per semester. Current: ${result.existingCredits - 1}, New: ${newCredits}, Total would be: ${totalCredits - 1}`
    );
  }

  // Check year limit
  if (year > YEAR_LIMITS.RECOMMENDED_MAX) {
    // Only show warning if this is the first course above YEAR_LIMITS.RECOMMENDED_MAX
    const alreadyHasCoursesAboveMax = await hasCoursesAboveMaxYear(authId);
    if (!alreadyHasCoursesAboveMax) {
      warnings.push(
        `This extends your plan beyond the recommended ${YEAR_LIMITS.RECOMMENDED_MAX} years. Please consult with your academic advisor`
      );
    }
  }

  // Check summer semester
  if (isSummer) {
    warnings.push(
      "Course offerings in summer semesters are not guaranteed and may change. Check with your advisor closer to the registration period"
    );
  }

  // Check semester mapping
  if (errors.length === 0 && !result.semesterMapping) {
    errors.push("Could not find or create semester mapping");
  }

  return {
    isValid: errors.length === 0,
    studentProfile: result.profile,
    semesterMapping: result.semesterMapping,
    errors,
    warnings,
  };
}

/**
 * Helper function for getting semester credits within a transaction
 */
async function getSemesterCreditsInTransaction(
  tx: any,
  authId: string,
  year: number,
  semester: number
): Promise<number> {
  // Get regular courses
  const regularCourses = await tx
    .select({
      credits: studentCourseCategorizedStatusView.credits,
    })
    .from(studentCourseCategorizedStatusView)
    .where(
      and(
        eq(studentCourseCategorizedStatusView.authId, authId),
        eq(studentCourseCategorizedStatusView.yearTaken, year),
        eq(studentCourseCategorizedStatusView.semesterTaken, semester)
      )
    );

  // Get placeholders
  const placeholders = await tx
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
  const regularCredits = regularCourses.reduce(
    (sum: number, course: { credits: any }) =>
      sum + parseFloat(course.credits?.toString() || "0"),
    0
  );

  const placeholderCredits = placeholders.reduce(
    (sum: number, course: { credits: any }) =>
      sum + parseFloat(course.credits?.toString() || "0"),
    0
  );

  return regularCredits + placeholderCredits;
}

/**
 * Helper function to get or create a semester mapping within a transaction
 */
async function getOrCreateSemesterMapping(
  tx: any,
  studentId: string,
  authId: string,
  cohortYear: number,
  programYear: number,
  programSemester: number,
  isSummer: boolean
): Promise<any> {
  // Calculate academic year based on cohort year and program year
  const baseYear = cohortYear - 4; // Year student started
  const startYear = baseYear + programYear - 1;
  const academicYearName = `${startYear}-${startYear + 1}`;

  // Determine sequence number (1, 2, or 3 for summer)
  const sequenceNumber = isSummer ? 3 : programSemester || 1;

  // Find the academic semester
  const semester = await tx.query.academicSemesters.findFirst({
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
  const existingMapping = await tx.query.studentSemesterMappings.findFirst({
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
  const [newMapping] = await tx
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
 * Simplified validation for placeholder electives
 */
async function validatePlaceholderPlacement(
  authId: string,
  credits: number,
  year: number,
  semester: number
): Promise<CoursePlacementValidationResponse> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isSummer = semester === 3;

  // Get all necessary data in a single transaction
  const result = await db.transaction(async (tx) => {
    // 1. Get student profile
    const profile = await getStudentProfileCached(authId, tx);

    if (!profile?.cohortYear) {
      return {
        profile: null,
        existingCredits: 0,
        semesterMapping: null,
      };
    }

    // 2. Calculate existing credits
    const semesterCredits = await getSemesterCreditsInTransaction(
      tx,
      authId,
      year,
      semester
    );

    const semesterCreditLimit = getCreditLimit(profile.majorCode, isSummer);

    // 3. Create semester mapping if needed
    const semesterMapping = await getOrCreateSemesterMapping(
      tx,
      profile.studentId!,
      authId,
      profile.cohortYear,
      year,
      semester,
      isSummer
    );

    return {
      profile,
      existingCredits: semesterCredits,
      semesterMapping,
      semesterCreditLimit,
    };
  });

  // Handle missing profile error
  if (!result.profile) {
    return {
      isValid: false,
      errors: ["Student profile incomplete or missing"],
      warnings: [],
    };
  }

  // Check credit load
  const totalCredits = result.existingCredits + credits;
  const maxCredits = result.semesterCreditLimit || 5;

  if (totalCredits > maxCredits) {
    warnings.push(
      `This will exceed the recommended credit limit of ${maxCredits} credits per semester. Current: ${result.existingCredits - 1}, New: ${credits}, Total would be: ${totalCredits - 1}`
    );
  }

  // Check year limit
  if (year > YEAR_LIMITS.RECOMMENDED_MAX) {
    // Only show warning if this is the first course above YEAR_LIMITS.RECOMMENDED_MAX
    const alreadyHasCoursesAboveMax = await hasCoursesAboveMaxYear(authId);
    if (!alreadyHasCoursesAboveMax) {
      warnings.push(
        `This extends your plan beyond the recommended ${YEAR_LIMITS.RECOMMENDED_MAX} years. Please consult with your academic advisor`
      );
    }
  }
  // Check summer semester
  if (isSummer) {
    warnings.push(
      "Course offerings in summer semesters are not guaranteed and may change. Check with your advisor closer to the registration period"
    );
  }

  // Check semester mapping
  if (!result.semesterMapping) {
    errors.push("Could not find or create semester mapping");
  }

  return {
    isValid: errors.length === 0,
    studentProfile: result.profile,
    semesterMapping: result.semesterMapping,
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
    const profile = await getStudentProfileCached(authId);

    // 1. Check if student already passed this course (specific to add)
    const courseStatus = await db
      .select()
      .from(studentCourseCategorizedStatusView)
      .where(
        and(
          eq(studentCourseCategorizedStatusView.authId, authId),
          eq(studentCourseCategorizedStatusView.courseCode, courseCode),
          eq(studentCourseCategorizedStatusView.isLatestAttempt, true)
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
          `You've already passed ${courseStatus[0].courseTitle} but retaking may improve your grade.`
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
        studentId: profile.studentId,
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
    const profile = await getStudentProfileCached(authId);

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
        studentId: profile.studentId,
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
      // Placeholder validation unchanged...
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

    // 3B. For real courses, check regular validation and ALSO dependency validation
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

    // NEW: Check if this course is a prerequisite for other planned courses
    const reverseCheck = await validatePrerequisiteMove(
      authId,
      courseRecord.courseCode!,
      newYear,
      newSemester
    );

    if (!reverseCheck.isValid) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message:
              reverseCheck.error ||
              "Cannot move this course to this semester because it is a prerequisite to other courses",
            code: "PREREQUISITE_MOVE_ERROR",
          })
        ),
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

// New function to validate moving a prerequisite
// Enhanced validation function with clear course titles
/**
 * Enhanced validation function for moving prerequisites using the centralized utility
 */
async function validatePrerequisiteMove(
  authId: string,
  courseCode: string,
  newYear: number,
  newSemester: number
): Promise<{ isValid: boolean; error?: string }> {
  // Get student profile to access the major code
  const studentProfile = await getStudentProfileCached(authId);

  const majorCode = studentProfile?.majorCode || null;

  // Load all prerequisite data
  const prereqData = await loadAllPrerequisiteData();

  // First, get the name of the course being moved
  const movingCourse = await db
    .select({
      title: courses.title,
    })
    .from(courses)
    .where(eq(courses.code, courseCode))
    .limit(1);

  const courseTitle =
    movingCourse.length > 0 ? movingCourse[0].title : courseCode;

  // Find all courses that have this as a prerequisite
  const dependentCourses = new Set<string>();

  // For each course in the prereqData
  for (const [
    potentialDependentCourse,
    groups,
  ] of prereqData.courseToGroups.entries()) {
    // Skip if it's the same course
    if (potentialDependentCourse === courseCode) continue;

    // Check if this course is a prerequisite for any group
    for (const group of groups) {
      // Skip concurrent or recommended groups
      if (group.isConcurrent || group.isRecommended) continue;

      // Skip groups that don't apply to this student's major
      if (group.applicableMajorCode && majorCode !== group.applicableMajorCode)
        continue;

      const prereqCourses = prereqData.groupToCourses.get(group.groupKey) || [];

      // If this course is a prerequisite for this group
      if (prereqCourses.some((pc) => pc.courseCode === courseCode)) {
        dependentCourses.add(potentialDependentCourse);
        break;
      }
    }
  }

  // If no course depends on this (this course isn't a prerequisite for anything), it's valid to move
  if (dependentCourses.size === 0) {
    return { isValid: true };
  }

  // Check if any dependent course is planned before the new position
  const plannedDependentCourses = await db
    .select({
      courseCode: studentCourseCategorizedStatusView.courseCode,
      courseTitle: studentCourseCategorizedStatusView.courseTitle,
      year: studentCourseCategorizedStatusView.yearTaken,
      semester: studentCourseCategorizedStatusView.semesterTaken,
      status: studentCourseCategorizedStatusView.status,
    })
    .from(studentCourseCategorizedStatusView)
    .where(
      and(
        eq(studentCourseCategorizedStatusView.authId, authId),
        eq(studentCourseCategorizedStatusView.status, "planned"),
        inArray(
          studentCourseCategorizedStatusView.courseCode,
          Array.from(dependentCourses)
        )
      )
    );

  // Find dependent courses that would now come before their prerequisite
  const problematicCourses = [];

  for (const course of plannedDependentCourses) {
    // Skip if null values
    if (!course.year || !course.semester || !course.courseCode) continue;

    // Check if this course comes before the new position
    const courseBeforeNewPosition =
      course.year < newYear ||
      (course.year === newYear && course.semester < newSemester);

    if (courseBeforeNewPosition) {
      // Add to list of dependent courses
      problematicCourses.push({
        code: course.courseCode,
        title: course.courseTitle || course.courseCode,
        year: course.year,
        semester: course.semester,
      });
    }
  }

  // If we found any conflicts, return an error
  if (problematicCourses.length > 0) {
    // Format semester names
    const getSemesterName = (sem: number) =>
      sem === 1 ? "Fall" : sem === 2 ? "Spring" : "Summer";

    // Format the dependent courses for the error message
    const formattedDependents = problematicCourses
      .map(
        (c) =>
          `${c.code} (${c.title}) in ${getSemesterName(c.semester)} Year ${c.year}`
      )
      .join(", ");

    // Create a clear error message with course titles
    return {
      isValid: false,
      error: `Cannot move ${courseCode} (${courseTitle}) to this semester because it's a prerequisite for: ${formattedDependents}`,
    };
  }

  // No conflicts found
  return { isValid: true };
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
    // 1. Get course details from the categorized view
    const courseResults = await db
      .select()
      .from(studentCourseCategorizedStatusView)
      .where(
        and(
          eq(studentCourseCategorizedStatusView.studentCourseId, courseId),
          eq(studentCourseCategorizedStatusView.authId, authId),
          eq(studentCourseCategorizedStatusView.status, "planned")
        )
      )
      .limit(1);

    // Check if course exists
    if (courseResults.length === 0) {
      return {
        success: false,
        error: serializeError(
          new AppError({
            message: "Course not found",
            code: "COURSE_NOT_FOUND",
          })
        ),
      };
    }

    let courseRecord = courseResults[0];

    // 2. ALWAYS delete the course first - unconditionally
    await db.delete(studentCourses).where(eq(studentCourses.id, courseId));

    // 3. Now check requirements and generate warnings as needed
    const categoryRequirements = await db
      .select()
      .from(studentDegreeRequirementProgressView)
      .where(
        and(
          eq(studentDegreeRequirementProgressView.authId, authId),
          eq(
            studentDegreeRequirementProgressView.categoryName,
            courseRecord.categoryName
          )
        )
      )
      .limit(1);

    if (categoryRequirements.length > 0) {
      const requirement = categoryRequirements[0];

      // Check if removing this course would leave unfulfilled requirements
      if (
        !requirement.requirementMet ||
        (requirement.requirementMet &&
          requirement.creditsCompleted === requirement.creditsRequired)
      ) {
        // Special handling for required courses vs electives
        if (
          courseRecord.courseCode &&
          courseRecord.categoryName !== "Major Electives" &&
          courseRecord.categoryName !== "Non-Major Electives"
        ) {
          // Compute the possible warning
          const requiredCourses = await db
            .select({
              categoryName: studentRemainingRequirementsView.categoryName,
              requirementType: studentRemainingRequirementsView.requirementType,
            })
            .from(studentRemainingRequirementsView)
            .where(
              and(
                eq(studentRemainingRequirementsView.authId, authId),
                eq(
                  studentRemainingRequirementsView.courseCode,
                  courseRecord.courseCode
                )
              )
            );

          if (requiredCourses.length > 0) {
            const category = requiredCourses[0].categoryName;
            const requirementType = requiredCourses[0].requirementType;
            // This is a specific required course
            if (requirementType === "retake_required") {
              warnings.push(
                `You must retake "${courseRecord.courseCode} - ${courseRecord.courseTitle}" because it is a required course for your degree. You will need to schedule it in a future semester to meet graduation requirements.`
              );
            } else {
              warnings.push(
                `"${courseRecord.courseCode} - ${courseRecord.courseTitle}"  is a required course for your degree. You will need to schedule it in a future semester to meet graduation requirements.`
              );
            }
          }
        } else {
          // This is an elective or placeholder
          // Remove the course

          // Computer the warning
          warnings.push(
            `"${courseRecord.courseTitle}" is ${
              courseRecord.subCategory
                ? courseRecord.subCategory === "Africana"
                  ? ` an ${courseRecord.subCategory}`
                  : ` a ${courseRecord.subCategory.slice(0, -1)}`
                : `${courseRecord.categoryName.slice(0, -1)}`
            } and you still need ${
              requirement.requirementMet &&
              requirement.creditsCompleted === requirement.creditsRequired
                ? requirement.creditsRemaining + 1
                : requirement.creditsRemaining
            } more credits in this category. Make sure to add another course to meet this requirement.`
          );
        }
      }
    }

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
 * Already optimized from your previous implementation
 */
/**
 * Get available courses a student can add to a specific semester
 * Now using the centralized prerequisite utility
 */
export async function getAvailableCoursesForSemester(
  authId: string,
  year: number,
  semester: number
): Promise<ActionResponse<SemesterAvailableCourses>> {
  try {
    const isSummer = semester === 3;
    const semesterType = isSummer
      ? "summer"
      : semester === 1
        ? "fall"
        : "spring";

    // Get student's major code first
    const stdudentProfile = await getStudentProfileCached(authId);

    const studentMajorCode = stdudentProfile.majorCode || undefined;

    // Preload prerequisite data for all courses
    const prereqData = await loadAllPrerequisiteData();

    // Get data in a single transaction to improve performance
    const [results] = await db.transaction(async (tx) => {
      // Get all passed courses in a single query
      const passedCourses = await tx
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

      // Get all planned courses before this semester
      const plannedCourses = await tx
        .select({
          courseCode: studentCourses.courseCode,
          year: studentSemesterMappings.programYear,
          semester: studentSemesterMappings.programSemester,
        })
        .from(studentCourses)
        .leftJoin(
          studentSemesterMappings,
          eq(
            studentCourses.semesterId,
            studentSemesterMappings.academicSemesterId
          )
        )
        .where(
          and(
            eq(studentCourses.authId, authId),
            eq(studentCourses.status, "planned"),
            sql`course_code IS NOT NULL`,
            or(
              lt(studentSemesterMappings.programYear, year),
              and(
                eq(studentSemesterMappings.programYear, year),
                lt(studentSemesterMappings.programSemester, semester)
              )
            )
          )
        );

      // Get course attempt information
      const courseAttempts = await tx
        .select({
          courseCode: studentCourseCategorizedStatusView.courseCode,
          passed: studentCourseCategorizedStatusView.passed,
          voluntaryRetakePossible:
            studentCourseCategorizedStatusView.voluntaryRetakePossible,
          retakeNeeded: studentCourseCategorizedStatusView.retakeNeeded,
          retakeLimitReached:
            studentCourseCategorizedStatusView.retakeLimitReached,
        })
        .from(studentCourseCategorizedStatusView)
        .where(
          and(
            eq(studentCourseCategorizedStatusView.authId, authId),
            eq(studentCourseCategorizedStatusView.isLatestAttempt, true)
          )
        );

      // Get remaining requirements
      const remainingReqs = await tx
        .select({
          courseCode: studentRemainingRequirementsView.courseCode,
          courseTitle: studentRemainingRequirementsView.courseTitle,
          credits: studentRemainingRequirementsView.credits,
          categoryName: studentRemainingRequirementsView.categoryName,
          offeredInSemesters:
            studentRemainingRequirementsView.offeredInSemesters,
          requirementType: studentRemainingRequirementsView.requirementType,
        })
        .from(studentRemainingRequirementsView)
        .where(
          and(
            eq(studentRemainingRequirementsView.authId, authId),
            sql`course_code IS NOT NULL`
          )
        );

      // Get basic info for all courses (for voluntary retakes and additional courses)
      const allCourseInfo = await tx
        .select({
          code: courses.code,
          title: courses.title,
          credits: courses.credits,
          offeredInSemesters: courses.offeredInSemesters,
        })
        .from(courses);

      return [
        {
          passedCourses,
          plannedCourses,
          courseAttempts,
          remainingReqs,
          allCourseInfo,
        },
      ];
    });

    // Create sets and maps for efficient lookups
    const passedCourseSet = new Set(
      results.passedCourses.map((c) => c.courseCode).filter(Boolean)
    );

    // Convert planned courses to the format expected by the utility function
    const plannedCoursesFormatted = results.plannedCourses
      .filter((c) => c.courseCode)
      .map((c) => ({
        courseCode: c.courseCode!,
        year: c.year || 0,
        semester: c.semester || 0,
      }));

    // Create course attempt maps
    const cantRetakeMap = new Map<string, boolean>();
    const retakeNeededMap = new Map<string, boolean>();
    const voluntaryRetakeMap = new Map<string, boolean>();

    for (const attempt of results.courseAttempts) {
      if (!attempt.courseCode) continue;

      // Can't retake if passed and not eligible for voluntary retake OR if failed and reached limit
      if (
        (attempt.passed && !attempt.voluntaryRetakePossible) ||
        (!attempt.passed && attempt.retakeLimitReached)
      ) {
        cantRetakeMap.set(attempt.courseCode, true);
      }

      if (attempt.retakeNeeded) {
        retakeNeededMap.set(attempt.courseCode, true);
      }

      if (attempt.passed && attempt.voluntaryRetakePossible) {
        voluntaryRetakeMap.set(attempt.courseCode, true);
      }
    }

    // Course info map for easy access
    const courseInfoMap = new Map(
      results.allCourseInfo.map((course) => [course.code, course])
    );

    // Process remaining requirements first (highest priority)
    const availableCourses: SemesterAvailableCourses = [];
    const processedCourses = new Set<string>();

    // Process required courses & retakes
    for (const req of results.remainingReqs) {
      if (!req.courseCode) continue;

      // Skip if can't be retaken
      if (cantRetakeMap.get(req.courseCode)) continue;

      // Create available courses set for prerequisite checking
      const availableCoursesForCheck = getAvailableCourses(
        passedCourseSet,
        plannedCoursesFormatted,
        year,
        semester
      );

      // Check prerequisites using our utility
      const prereqResult = checkPrerequisites(
        req.courseCode,
        availableCoursesForCheck,
        prereqData,
        studentMajorCode
      );

      if (!prereqResult.isMet) continue;

      // Check if offered in this semester
      const isOfferedInSemester =
        req.offeredInSemesters?.includes(semesterType as any) ?? true;

      availableCourses.push({
        code: req.courseCode,
        title: req.courseTitle || "",
        credits: Number(req.credits || 1),
        category: req.categoryName || "General",
        offeredInSemester: isOfferedInSemester,
        isRetake: req.requirementType === "retake_required",
        retakeReason:
          req.requirementType === "retake_required"
            ? "Course needs to be retaken to meet requirements"
            : undefined,
      });

      processedCourses.add(req.courseCode);
    }

    // Process voluntary retakes
    for (const [courseCode, canRetake] of voluntaryRetakeMap.entries()) {
      if (processedCourses.has(courseCode)) continue;

      const courseInfo = courseInfoMap.get(courseCode);
      if (!courseInfo) continue;

      // Create available courses set for prerequisite checking
      const availableCoursesForCheck = getAvailableCourses(
        passedCourseSet,
        plannedCoursesFormatted,
        year,
        semester
      );

      // Check prerequisites using our utility
      const prereqResult = checkPrerequisites(
        courseCode,
        availableCoursesForCheck,
        prereqData,
        studentMajorCode
      );

      if (!prereqResult.isMet) continue;

      const isOfferedInSemester =
        courseInfo.offeredInSemesters?.includes(semesterType as any) ?? true;

      availableCourses.push({
        code: courseCode,
        title: courseInfo.title || "",
        credits: Number(courseInfo.credits || 1),
        category: "Voluntary Retake",
        offeredInSemester: isOfferedInSemester,
        isRetake: true,
        retakeReason: "Can be retaken to improve grade",
      });

      processedCourses.add(courseCode);
    }

    // Add all other available courses
    for (const course of results.allCourseInfo) {
      if (processedCourses.has(course.code)) continue;
      if (cantRetakeMap.get(course.code)) continue;

      // Create available courses set for prerequisite checking
      const availableCoursesForCheck = getAvailableCourses(
        passedCourseSet,
        plannedCoursesFormatted,
        year,
        semester
      );

      // Check prerequisites using our utility
      const prereqResult = checkPrerequisites(
        course.code,
        availableCoursesForCheck,
        prereqData,
        studentMajorCode
      );

      if (!prereqResult.isMet) continue;

      const isOfferedInSemester =
        course.offeredInSemesters?.includes(semesterType as any) ?? true;

      availableCourses.push({
        code: course.code,
        title: course.title || "",
        credits: Number(course.credits || 1),
        category: "Elective",
        offeredInSemester: isOfferedInSemester,
        isRetake: false,
      });
    }

    // Sort courses
    availableCourses.sort((a, b) => {
      // Required retakes first
      if (
        a.isRetake &&
        a.retakeReason?.includes("needs to be retaken") &&
        (!b.isRetake || !b.retakeReason?.includes("needs to be retaken"))
      ) {
        return -1;
      }
      if (
        b.isRetake &&
        b.retakeReason?.includes("needs to be retaken") &&
        (!a.isRetake || !a.retakeReason?.includes("needs to be retaken"))
      ) {
        return 1;
      }

      // Required courses second
      if (
        a.category === "Required Major Classes" &&
        b.category !== "Required Major Classes"
      ) {
        return -1;
      }
      if (
        b.category === "Required Major Classes" &&
        a.category !== "Required Major Classes"
      ) {
        return 1;
      }

      // Sort by whether offered in this semester
      if (a.offeredInSemester && !b.offeredInSemester) return -1;
      if (!a.offeredInSemester && b.offeredInSemester) return 1;

      // Lastly sort by course code
      return a.code.localeCompare(b.code);
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
    columns: { offeredInSemesters: true, title: true },
  });

  if (!course?.offeredInSemesters) {
    return { isOffered: false, warning: "Course not found" };
  }

  const semesterType = isSummer
    ? "summer"
    : programSemester === 1
      ? "fall"
      : "spring";

  const isOffered = course?.offeredInSemesters.includes(
    semesterType as "fall" | "spring" | "summer"
  );

  return {
    isOffered,
    warning: isOffered
      ? undefined
      : `"${course.title}" is typically not offered in "${semesterType}" semester. You may need to adjust your planning if this course isn't available`,
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
function getCategoryParent(categoryName: string | null): string {
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
    const studentProfile = await getStudentProfileCached(authId);

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

    // 2. Clear any existing planned courses
    await db
      .delete(studentCourses)
      .where(
        and(
          eq(studentCourses.authId, authId),
          eq(studentCourses.status, "planned")
        )
      );

    // 3. Get remaining requirements in order of priority
    const remainingRequirements = await db
      .select()
      .from(studentRemainingRequirementsView)
      .where(eq(studentRemainingRequirementsView.authId, authId))
      .orderBy(
        // First by requirement type (retakes first, then required courses, then electives)
        sql`CASE 
          WHEN requirement_type = 'retake_required' THEN 1
          WHEN requirement_type = 'required_course' THEN 2
          ELSE 3
        END`,
        // Then by recommended year and semester if available
        asc(studentRemainingRequirementsView.recommendedYear),
        asc(studentRemainingRequirementsView.recommendedSemester),
        // Finally by priority_order from the view
        asc(studentRemainingRequirementsView.priorityOrder)
      );

    // 4. Fetch passed courses for prerequisite checking
    const passedCourses = await db
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

    const passedCourseCodes = new Set(
      passedCourses.map((c) => c.courseCode).filter(Boolean)
    );

    // 5. Prepare to track placements
    let placementYear = currentYear;
    let placementSemester = currentSemester;
    const placedCourses = new Map(); // courseCode -> {year, semester}
    const semesterLoads = new Map(); // "year-semester" -> creditTotal

    // Track summary for result message
    const summary = {
      totalPlaced: 0,
      retakesPlaced: 0,
      requiredPlaced: 0,
      electivesPlaced: 0,
      semesterPlacements: {},
      unplacedCourses: [],
    };

    // 6. Process each requirement in order
    for (const req of remainingRequirements) {
      // For concrete courses with course codes
      if (req.courseCode) {
        await placeRequiredCourse(
          req,
          authId,
          studentProfile.studentId,
          studentProfile.cohortYear || new Date().getFullYear() - 18, // Default to current year - 18
          placementYear,
          placementSemester,
          passedCourseCodes,
          placedCourses,
          semesterLoads,
          summary,
          options?.balanceCredits ?? true
        );
      }
      // For elective placeholders
      else if (req.requirementType === "elective_placeholder") {
        await placeElectivePlaceholder(
          req,
          authId,
          studentProfile.studentId,
          studentProfile.cohortYear || new Date().getFullYear() - 18,
          placementYear,
          placementSemester,
          semesterLoads,
          summary,
          options?.balanceCredits ?? true
        );
      }
    }

    // 7. Get the updated plan
    const updatedPlan = await getStudentAcademicPlan(authId);

    return {
      success: true,
      data: updatedPlan.data!,
      message: generateSummaryMessage(summary),
    };
  } catch (error) {
    console.error("Error generating automatic plan:", error);
    return {
      success: false,
      error: serializeError(error),
    };
  }
}

/**
 * Check if a course's prerequisites are met
 */
// Update arePrerequisitesMet in placeRequiredCourse
async function arePrerequisitesMet(
  courseCode: string,
  authId: string,
  year: number,
  semester: number,
  passedCourses: Set<string>,
  placedCourses: Map<string, { year: number; semester: number }>
): Promise<boolean> {
  // Get student profile to access the major code
  const studentProfile = await getStudentProfileCached(authId);

  const majorCode = studentProfile?.majorCode || undefined;

  // Load prerequisite data
  const prereqData = await loadAllPrerequisiteData();

  // Calculate available courses
  const availableCourses = new Set([...passedCourses]);

  // Add planned courses that come before this semester
  for (const [course, placement] of placedCourses.entries()) {
    // Only include courses that would be taken before the target semester
    if (
      placement.year < year ||
      (placement.year === year && placement.semester < semester)
    ) {
      availableCourses.add(course);
    }
  }

  // Use the utility to check prerequisites
  return checkPrerequisites(courseCode, availableCourses, prereqData, majorCode)
    .isMet;
}

/**
 * Place a required course in the plan
 */
/**
 * The place required course function now using the centralized prerequisite utility
 */
async function placeRequiredCourse(
  course: any,
  authId: string,
  studentId: string,
  cohortYear: number,
  startYear: number,
  startSemester: number,
  passedCourses: Set<string>,
  placedCourses: Map<string, { year: number; semester: number }>,
  semesterLoads: Map<string, number>,
  summary: any,
  balanceCredits: boolean
): Promise<boolean> {
  // Get student profile to access the major code
  const studentProfile = await getStudentProfileCached(authId);

  const majorCode = studentProfile?.majorCode || undefined;

  const isRetake = course.requirementType === "retake_required";
  const courseCredits = parseFloat(course.credits?.toString() || "1");
  const MAX_CREDITS = getCreditLimit(studentProfile.majorCode);

  // Preload prerequisite data
  const prereqData = await loadAllPrerequisiteData();

  // Start from the suggested year/semester if available
  let placementYear = startYear;
  let placementSemester = startSemester;

  // For non-retakes, try to use recommended year/semester if it's in the future
  if (!isRetake && course.recommendedYear && course.recommendedSemester) {
    const isInFuture =
      course.recommendedYear > startYear ||
      (course.recommendedYear === startYear &&
        course.recommendedSemester >= startSemester);

    if (isInFuture) {
      placementYear = course.recommendedYear;
      placementSemester = course.recommendedSemester;
    }
  }

  // Try to place the course
  let placed = false;
  let maxAttempts = 32; // 8 years × 2 semesters × 2 safety factor

  while (!placed && placementYear <= 8 && maxAttempts > 0) {
    maxAttempts--;

    // Check if course is offered in this semester
    const semesterType = placementSemester === 1 ? "fall" : "spring";
    const isOffered =
      !course.offeredInSemesters ||
      !Array.isArray(course.offeredInSemesters) ||
      course.offeredInSemesters.length === 0 ||
      course.offeredInSemesters.includes(semesterType);

    if (!isOffered) {
      // Advance to next semester
      if (placementSemester === 1) {
        placementSemester = 2;
      } else {
        placementSemester = 1;
        placementYear++;
      }
      continue;
    }

    // Convert passed and placed courses to the format expected by the utility
    const placedCoursesFormatted = Array.from(placedCourses.entries()).map(
      ([code, info]) => ({
        courseCode: code,
        year: info.year,
        semester: info.semester,
      })
    );

    const availableCoursesSet = getAvailableCourses(
      passedCourses,
      placedCoursesFormatted,
      placementYear,
      placementSemester
    );

    // Check prerequisites using the utility
    const prereqsMet = checkPrerequisites(
      course.courseCode,
      availableCoursesSet,
      prereqData,
      majorCode
    ).isMet;

    if (!prereqsMet) {
      // Advance to next semester
      if (placementSemester === 1) {
        placementSemester = 2;
      } else {
        placementSemester = 1;
        placementYear++;
      }
      continue;
    }

    // Check credit load
    const semesterKey = `${placementYear}-${placementSemester}`;
    const currentCredits = semesterLoads.get(semesterKey) || 0;

    // Determine if we should place here or move to next semester
    let shouldPlace = true;

    // For retakes, always place immediately
    // For regular courses, try to balance credits if requested
    if (
      !isRetake &&
      currentCredits + courseCredits > MAX_CREDITS &&
      balanceCredits &&
      maxAttempts > 10
    ) {
      shouldPlace = false;
    }

    if (shouldPlace) {
      try {
        // Get or create semester mapping
        const semesterMapping = await getSemesterMapping(
          authId,
          studentId,
          cohortYear,
          placementYear,
          placementSemester,
          false // Not summer
        );

        if (!semesterMapping) {
          throw new Error(
            `Failed to create semester mapping for ${placementYear}-${placementSemester}`
          );
        }

        // Add course to plan
        const [newCourse] = await db
          .insert(studentCourses)
          .values({
            authId,
            studentId,
            courseCode: course.courseCode,
            semesterId: semesterMapping.academicSemesterId,
            status: "planned",
          })
          .returning();

        // Update tracking
        placedCourses.set(course.courseCode, {
          year: placementYear,
          semester: placementSemester,
        });

        semesterLoads.set(semesterKey, currentCredits + courseCredits);

        // Update summary
        summary.totalPlaced++;

        if (isRetake) {
          summary.retakesPlaced++;
        } else {
          summary.requiredPlaced++;
        }

        // Add to semester placements
        if (!summary.semesterPlacements[semesterKey]) {
          summary.semesterPlacements[semesterKey] = {
            year: placementYear,
            semester: placementSemester,
            semesterName: placementSemester === 1 ? "Fall" : "Spring",
            credits: 0,
            courses: [],
          };
        }

        summary.semesterPlacements[semesterKey].credits += courseCredits;
        summary.semesterPlacements[semesterKey].courses.push({
          code: course.courseCode,
          title: course.courseTitle,
          credits: courseCredits,
          type: isRetake ? "Retake" : "Required",
        });

        placed = true;
      } catch (error) {
        console.error(`Error placing course ${course.courseCode}:`, error);

        // Advance to next semester on error
        if (placementSemester === 1) {
          placementSemester = 2;
        } else {
          placementSemester = 1;
          placementYear++;
        }
      }
    } else {
      // Advance to next semester for credit balancing
      if (placementSemester === 1) {
        placementSemester = 2;
      } else {
        placementSemester = 1;
        placementYear++;
      }
    }
  }

  // If we couldn't place the course
  if (!placed) {
    console.warn(
      `Could not place course ${course.courseCode} after ${32 - maxAttempts} attempts`
    );

    summary.unplacedCourses.push({
      code: course.courseCode,
      title: course.courseTitle,
      reason:
        maxAttempts <= 0
          ? "Maximum placement attempts reached"
          : "Could not find a suitable semester within 8 years",
    });
  }

  return placed;
}

/**
 * Place an elective placeholder in the plan
 */
async function placeElectivePlaceholder(
  elective: any,
  authId: string,
  studentId: string,
  cohortYear: number,
  startYear: number,
  startSemester: number,
  semesterLoads: Map<string, number>,
  summary: any,
  balanceCredits: boolean
): Promise<boolean> {
  const electiveCredits = parseFloat(elective.credits?.toString() || "1");
  const profile = await getStudentProfileCached(authId);
  const MAX_CREDITS = getCreditLimit(profile.majorCode);

  // For electives, start from year 2 or current year, whichever is later
  let placementYear = Math.max(startYear, 2);

  // Try to place the elective
  let placed = false;
  let maxAttempts = 32;

  while (!placed && placementYear <= 8 && maxAttempts > 0) {
    maxAttempts--;

    // Try both semesters in the current year
    for (let semester = startSemester; semester <= 2; semester++) {
      const semesterKey = `${placementYear}-${semester}`;
      const currentCredits = semesterLoads.get(semesterKey) || 0;

      // Check if credits would be under the limit or we're not balancing
      if (
        currentCredits + electiveCredits <= MAX_CREDITS ||
        !balanceCredits ||
        maxAttempts < 10
      ) {
        try {
          // Get or create semester mapping
          const semesterMapping = await getSemesterMapping(
            authId,
            studentId,
            cohortYear,
            placementYear,
            semester,
            false // Not summer
          );

          if (!semesterMapping) {
            throw new Error(
              `Failed to create semester mapping for ${placementYear}-${semester}`
            );
          }

          // Add elective placeholder to plan
          const [newPlaceholder] = await db
            .insert(studentCourses)
            .values({
              authId,
              studentId,
              courseCode: null, // No course code for placeholders
              semesterId: semesterMapping.academicSemesterId,
              status: "planned",
              placeholderTitle: elective.courseTitle,
              placeholderCredits: electiveCredits.toString(),
              categoryName: elective.categoryName,
            })
            .returning();

          // Update credit tracking
          semesterLoads.set(semesterKey, currentCredits + electiveCredits);

          // Update summary
          summary.totalPlaced++;
          summary.electivesPlaced++;

          // Add to semester placements
          if (!summary.semesterPlacements[semesterKey]) {
            summary.semesterPlacements[semesterKey] = {
              year: placementYear,
              semester,
              semesterName: semester === 1 ? "Fall" : "Spring",
              credits: 0,
              courses: [],
            };
          }

          summary.semesterPlacements[semesterKey].credits += electiveCredits;
          summary.semesterPlacements[semesterKey].courses.push({
            code: null,
            title: elective.courseTitle,
            credits: electiveCredits,
            type: "Elective",
          });

          placed = true;
          break;
        } catch (error) {
          console.error(
            `Error placing elective ${elective.courseTitle}:`,
            error
          );
          // Continue to next semester
        }
      }
    }

    // If not placed in this year, move to next year
    if (!placed) {
      placementYear++;
      startSemester = 1; // Reset semester to Fall for next year
    }
  }

  // If we couldn't place the elective
  if (!placed) {
    console.warn(
      `Could not place elective ${elective.courseTitle} after ${32 - maxAttempts} attempts`
    );

    summary.unplacedCourses.push({
      title: elective.courseTitle,
      reason:
        maxAttempts <= 0
          ? "Maximum placement attempts reached"
          : "Could not find a suitable semester within 8 years",
    });
  }

  return placed;
}

/**
 * Helper to get or create a semester mapping
 */
async function getSemesterMapping(
  authId: string,
  studentId: string,
  cohortYear: number,
  programYear: number,
  programSemester: number,
  isSummer: boolean
): Promise<any> {
  // Calculate academic year based on cohort year and program year
  const baseYear = cohortYear - 4; // Year student started
  const startYear = baseYear + programYear - 1;
  const academicYearName = `${startYear}-${startYear + 1}`;

  // Determine sequence number (1, 2, or 3 for summer)
  const sequenceNumber = isSummer ? 3 : programSemester;

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
      authId,
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
 * Generate a human-readable summary of what was placed
 */
function generateSummaryMessage(summary: PlacementSummary): string {
  // Count how many semesters
  const semesterCount = Object.keys(summary.semesterPlacements).length;

  // Basic summary
  let message = `Successfully added ${summary.totalPlaced} courses to your plan across ${semesterCount} semesters.`;

  // Add details about types
  if (summary.retakesPlaced > 0) {
    message += ` ${summary.retakesPlaced} ${summary.retakesPlaced === 1 ? "is a course" : "are courses"} you needed to retake.`;
  }

  if (summary.electivesPlaced > 0) {
    message += ` ${summary.electivesPlaced} ${summary.electivesPlaced === 1 ? "is an elective placeholder" : "are elective placeholders"} that you'll need to replace with actual elective courses (If you know the actual electives you want to do)`;
  }

  // Add unplaced warning if any
  if (summary.unplacedCourses.length > 0) {
    message += ` ${summary.unplacedCourses.length} required ${summary.unplacedCourses.length === 1 ? "course" : "courses"} could not be placed - you may need to adjust your plan manually.`;
  }

  // Add warning about overloaded semesters
  const overloadedSemesters = Object.entries(summary.semesterPlacements).filter(
    ([_, data]) => data.credits > 5
  );

  if (overloadedSemesters.length > 0) {
    message += ` Note: ${overloadedSemesters.length} ${overloadedSemesters.length === 1 ? "semester has" : "semesters have"} more than 5 credits.`;
  }

  return message;
}
