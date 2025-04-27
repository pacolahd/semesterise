"use server";

// src/lib/academic-plan/academic-plan-actions.ts
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  StudentCourseStatusRecord,
  academicSemesters,
  authUsers,
  courses,
  prerequisiteCourses,
  prerequisiteGroups,
  studentCourseCategorizedStatusView,
  studentCourses,
  studentDegreeRequirementProgressView,
  studentProfiles,
  studentRemainingRequirementsView,
  studentRequiredCoursesView,
  studentSemesterMappings,
} from "@/drizzle/schema";
import { PrerequisiteGroupRecord } from "@/drizzle/schema/curriculum/prerequisite-groups";
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
const MAX_TOTAL_YEARS = 8;

// Add this cache at the top level of your file (outside any functions)
const hasCoursesAboveMaxYearCache = new Map<string, boolean>();

// Efficient function to check if student has courses above MAX_RECOMMENDED_YEARS
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
        sql`year_taken > ${MAX_RECOMMENDED_YEARS}`
      )
    )
    .limit(1);

  const hasCoursesAbove = result.length > 0 && Number(result[0].count) > 0;

  // Cache the result
  hasCoursesAboveMaxYearCache.set(authId, hasCoursesAbove);

  return hasCoursesAbove;
}

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
 * Optimized to use a transaction and reduce the number of queries
 */
export async function getStudentAcademicPlan(
  authId: string
): Promise<ActionResponse<YearPlan>> {
  try {
    // Run all queries in a single transaction to reduce database roundtrips
    const result = await db.transaction(async (tx) => {
      // 1. Get student profile information
      const profileData = await tx.query.studentProfiles.findFirst({
        where: eq(studentProfiles.authId, authId),
      });

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
    for (let year = 1; year <= MAX_TOTAL_YEARS; year++) {
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
        yearObj.fall.totalCredits > MAX_CREDITS_PER_SEMESTER;
      yearObj.spring.hasCreditWarning =
        yearObj.spring.totalCredits > MAX_CREDITS_PER_SEMESTER;
      if (yearObj.summer) {
        yearObj.summer.hasCreditWarning =
          yearObj.summer.totalCredits > MAX_CREDITS_PER_SEMESTER;
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
 * Optimized prerequisite checking that can leverage a cache or preloaded data
 * Much faster when checking prerequisites for multiple courses
 */
async function loadPrerequisiteData(
  courseCode: string,
  forceRefresh = false
): Promise<{
  groups: PrerequisiteGroupRecord[];
  coursesMap: Map<string, string[]>;
}> {
  // Check if we have cached data that's less than 5 minutes old
  const cacheKey = courseCode;
  const cachedData = prerequisiteCache.get(cacheKey);
  const now = Date.now();

  if (
    cachedData &&
    !forceRefresh &&
    now - cachedData.timestamp < 24 * 60 * 60 * 1000
  ) {
    return {
      groups: cachedData.groups,
      coursesMap: cachedData.coursesMap,
    };
  }

  // Fetch prerequisite data with a single query
  const groups: PrerequisiteGroupRecord[] = await db
    .select()
    .from(prerequisiteGroups)
    .where(eq(prerequisiteGroups.courseCode, courseCode));

  // Create a map for efficient lookups
  const coursesMap = new Map<string, string[]>();

  // If there are prerequisite groups, get all courses at once
  if (groups.length > 0) {
    const groupKeys = groups.map((g) => g.groupKey);

    const prereqCourses = await db
      .select({
        groupKey: prerequisiteCourses.groupKey,
        prereqCourseCode: prerequisiteCourses.prerequisiteCourseCode,
      })
      .from(prerequisiteCourses)
      .where(inArray(prerequisiteCourses.groupKey, groupKeys));

    // Organize courses by group
    for (const prereq of prereqCourses) {
      if (!coursesMap.has(prereq.groupKey)) {
        coursesMap.set(prereq.groupKey, []);
      }
      const courseList = coursesMap.get(prereq.groupKey);
      if (courseList && prereq.prereqCourseCode) {
        courseList.push(prereq.prereqCourseCode);
      }
    }
  }

  // Cache the results
  prerequisiteCache.set(cacheKey, {
    groups,
    coursesMap,
    timestamp: now,
  });

  return { groups, coursesMap };
}

/**
 * Completely optimized prerequisite check
 * Uses cached data and performs fewer database queries
 */
export async function checkPrerequisitesMet(
  authId: string,
  courseCode: string,
  year: number,
  semester: number
): Promise<PrerequisiteCheckResult> {
  // Get prerequisite data, potentially from cache
  const { groups, coursesMap } = await loadPrerequisiteData(courseCode);

  // If no prerequisites, return true immediately
  if (groups.length === 0) {
    return {
      courseCode,
      isMet: true,
    };
  }

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
    // This avoids the need to join with studentSemesterMappings separately
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

  // Filter planned courses to only those that would be taken before current semester
  // Now we can directly use the yearTaken and semesterTaken fields from the view
  const validPlannedCourses = plannedCourses
    .filter((course) => {
      if (!course.courseCode || !course.yearTaken || !course.semesterTaken)
        return false;

      return (
        course.yearTaken < year ||
        (course.yearTaken === year && course.semesterTaken < semester)
      );
    })
    .map((c) => c.courseCode)
    .filter(Boolean) as string[];

  // Create a set of all available courses
  const availableCourses = new Set([
    ...passedCourseSet,
    ...validPlannedCourses,
  ]);

  // Check each prerequisite group
  const missingPrerequisites = [];
  let allGroupsMet = true;

  for (const group of groups) {
    // Skip concurrent or recommended groups
    if (group.isConcurrent || group.isRecommended) {
      continue;
    }

    // Get courses in this group
    const groupCourses = coursesMap.get(group.groupKey) || [];
    let groupSatisfied = false;

    // Check if group is satisfied based on the operator
    if (group.internalLogicOperator === "AND") {
      groupSatisfied = groupCourses.every((code) => availableCourses.has(code));
    } else {
      groupSatisfied = groupCourses.some((code) => availableCourses.has(code));
    }

    // If group is not satisfied, add to missing prerequisites
    if (!groupSatisfied) {
      allGroupsMet = false;

      missingPrerequisites.push({
        groupName: group.groupName,
        courses: groupCourses,
        internalLogicOperator: group.internalLogicOperator,
        requiredCount:
          group.internalLogicOperator === "AND" ? groupCourses.length : 1,
        satisfiedCount: groupCourses.filter((code) =>
          availableCourses.has(code)
        ).length,
      });
    }
  }

  // Generate info message for UI
  let infoMessage = "";
  if (!allGroupsMet) {
    infoMessage = missingPrerequisites
      .map(
        (g) =>
          `${g.groupName}: ${g.requiredCount === 1 ? "You need this course" : `You need ${g.requiredCount} courses but have ${g.satisfiedCount}`}`
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
 * Optimized validation that performs fewer queries by batching related checks
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
    const profile = await tx.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, authId),
    });

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
      columns: { credits: true, offeredInSemesters: true },
    });

    // 3. Calculate existing credits
    const semesterCredits = await getSemesterCreditsInTransaction(
      tx,
      authId,
      year,
      semester
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

  // Check prerequisites
  const prerequisiteCheck = await checkPrerequisitesMet(
    authId,
    courseCode,
    year,
    semester
  );

  if (!prerequisiteCheck.isMet && prerequisiteCheck.missingPrerequisites) {
    // Get course title for the course being added
    const course = await db.query.courses.findFirst({
      where: eq(courses.code, courseCode),
      columns: { title: true },
    });

    const courseTitle = course?.title || courseCode;

    // Get titles for missing prerequisite courses
    const allMissingCourseCodes = [
      ...new Set(
        prerequisiteCheck.missingPrerequisites.flatMap((group) => group.courses)
      ),
    ];

    const missingCourseTitles = await db
      .select({
        code: courses.code,
        title: courses.title,
      })
      .from(courses)
      .where(inArray(courses.code, allMissingCourseCodes));

    // Create a map of course codes to titles
    const courseTitleMap = new Map(
      missingCourseTitles.map((c) => [c.code, c.title])
    );

    // Format enhanced error message
    const enhancedMessage = prerequisiteCheck.missingPrerequisites
      .map((group) => {
        const courseList = group.courses
          .map((code) => {
            const title = courseTitleMap.get(code) || code;
            return `${code} (${title})`;
          })
          .join(", ");

        if (group.requiredCount === 1) {
          return `${group.groupName}: You must complete ${courseList} before taking ${courseCode} (${courseTitle})`;
        } else if (group.internalLogicOperator === "AND") {
          return `${group.groupName}: You must complete all of these courses (${courseList}) before taking ${courseCode} (${courseTitle})`;
        } else {
          return `${group.groupName}: You must complete at least one of these courses (${courseList}) before taking ${courseCode} (${courseTitle})`;
        }
      })
      .join("; ");

    errors.push(`Prerequisites not met: ${enhancedMessage}`);
  } else if (!prerequisiteCheck.isMet) {
    // Fallback to the original message
    errors.push(
      `Prerequisites not met: ${prerequisiteCheck.infoMessage || "Missing prerequisites"}`
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
        `This course is typically not offered in ${semesterType} semester. You may need to adjust your planning if this course isn't available`
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

  if (totalCredits > MAX_CREDITS_PER_SEMESTER) {
    warnings.push(
      `This will exceed the recommended credit limit of ${MAX_CREDITS_PER_SEMESTER} credits per semester. Current: ${result.existingCredits - 1}, New: ${newCredits}, Total would be: ${totalCredits - 1}`
    );
  }

  // Check year limit
  if (year > MAX_RECOMMENDED_YEARS) {
    // Only show warning if this is the first course above MAX_RECOMMENDED_YEARS
    const alreadyHasCoursesAboveMax = await hasCoursesAboveMaxYear(authId);
    if (!alreadyHasCoursesAboveMax) {
      warnings.push(
        `This extends your plan beyond the recommended ${MAX_RECOMMENDED_YEARS} years. Please consult with your academic advisor`
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
    const profile = await tx.query.studentProfiles.findFirst({
      where: eq(studentProfiles.authId, authId),
    });

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

  if (totalCredits > MAX_CREDITS_PER_SEMESTER) {
    warnings.push(
      `This will exceed the recommended credit limit of ${MAX_CREDITS_PER_SEMESTER} credits per semester. Current: ${result.existingCredits - 1}, New: ${credits}, Total would be: ${totalCredits - 1}`
    );
  }

  // Check year limit
  if (year > MAX_RECOMMENDED_YEARS) {
    // Only show warning if this is the first course above MAX_RECOMMENDED_YEARS
    const alreadyHasCoursesAboveMax = await hasCoursesAboveMaxYear(authId);
    if (!alreadyHasCoursesAboveMax) {
      warnings.push(
        `This extends your plan beyond the recommended ${MAX_RECOMMENDED_YEARS} years. Please consult with your academic advisor`
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
async function validatePrerequisiteMove(
  authId: string,
  courseCode: string,
  newYear: number,
  newSemester: number
): Promise<{ isValid: boolean; error?: string }> {
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

  // 1. Get all prerequisite relationships where this course is a prerequisite
  const prereqRelationships = await db
    .select({
      courseCode: prerequisiteCourses.groupKey,
      groupKey: prerequisiteCourses.groupKey,
    })
    .from(prerequisiteCourses)
    .where(eq(prerequisiteCourses.prerequisiteCourseCode, courseCode));

  // If this course isn't a prerequisite for anything, it's valid to move
  if (prereqRelationships.length === 0) {
    return { isValid: true };
  }

  // Get all unique group keys
  const groupKeys = [...new Set(prereqRelationships.map((p) => p.groupKey))];

  // 2. Get all prerequisite groups with their course codes
  const prereqGroups = await db
    .select()
    .from(prerequisiteGroups)
    .where(inArray(prerequisiteGroups.groupKey, groupKeys));

  // Extract course codes of dependent courses
  const dependentCourseCodes = prereqGroups.map((g) => g.courseCode);

  // 3. Get all planned courses that might depend on this course with their titles
  const plannedCourses = await db
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
          dependentCourseCodes
        )
      )
    );

  // 4. Check if we're moving a prerequisite to a semester after any dependent course
  const dependentCourses = [];

  for (const course of plannedCourses) {
    // Skip if null values
    if (!course.year || !course.semester || !course.courseCode) continue;

    // Check if this course comes before the new position
    const courseBeforeNewPosition =
      course.year < newYear ||
      (course.year === newYear && course.semester < newSemester);

    if (courseBeforeNewPosition) {
      // Add to list of dependent courses
      dependentCourses.push({
        code: course.courseCode,
        title: course.courseTitle || course.courseCode,
        year: course.year,
        semester: course.semester,
      });
    }
  }

  // If we found any conflicts, return an error
  if (dependentCourses.length > 0) {
    // Format semester names
    const getSemesterName = (sem: number) =>
      sem === 1 ? "Fall" : sem === 2 ? "Spring" : "Summer";

    // Format the dependent courses for the error message
    const formattedDependents = dependentCourses
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
 * Already optimized from your previous implementation
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

    // Get data in a single transaction to improve performance
    const [results] = await db.transaction(async (tx) => {
      // 1. Get prerequisites for all courses in a single query
      const allPrerequisites = await tx
        .select({
          courseCode: prerequisiteGroups.courseCode,
          prereqCourseCode: prerequisiteCourses.prerequisiteCourseCode,
          operator: prerequisiteGroups.internalLogicOperator,
          isConcurrent: prerequisiteGroups.isConcurrent,
          isRecommended: prerequisiteGroups.isRecommended,
        })
        .from(prerequisiteGroups)
        .leftJoin(
          prerequisiteCourses,
          eq(prerequisiteGroups.groupKey, prerequisiteCourses.groupKey)
        )
        .where(
          and(
            eq(prerequisiteGroups.isConcurrent, false),
            eq(prerequisiteGroups.isRecommended, false)
          )
        );

      // 2. Get all passed courses in a single query
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

      // 3. Get all planned courses before this semester
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

      // 4. Get course attempt information
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

      // 5. Get remaining requirements
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

      // 6. Get basic info for all courses (for voluntary retakes and additional courses)
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
          allPrerequisites,
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
    const plannedCourseSet = new Set(
      results.plannedCourses.map((c) => c.courseCode).filter(Boolean)
    );

    // Build prerequisite map for efficient checks
    const prerequisiteMap = new Map<string, Map<string, string[]>>();

    for (const prereq of results.allPrerequisites) {
      if (!prereq.courseCode || !prereq.prereqCourseCode) continue;

      if (!prerequisiteMap.has(prereq.courseCode)) {
        prerequisiteMap.set(prereq.courseCode, new Map());
      }

      const coursePrereqs = prerequisiteMap.get(prereq.courseCode)!;
      if (!coursePrereqs.has(prereq.operator)) {
        coursePrereqs.set(prereq.operator, []);
      }

      const operatorCourses = coursePrereqs.get(prereq.operator);
      if (operatorCourses) {
        operatorCourses.push(prereq.prereqCourseCode);
      }
    }

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

    // Helper function to check prerequisites (much faster in memory)
    function hasPrerequisitesMet(courseCode: string): boolean {
      if (!prerequisiteMap.has(courseCode)) {
        return true; // No prerequisites
      }

      const prereqGroups = prerequisiteMap.get(courseCode)!;

      // Check AND groups (all prerequisites required)
      if (prereqGroups.has("AND")) {
        const andPrereqs = prereqGroups.get("AND");
        if (andPrereqs) {
          for (const prereq of andPrereqs) {
            if (!passedCourseSet.has(prereq) && !plannedCourseSet.has(prereq)) {
              return false;
            }
          }
        }
      }

      // Check OR groups (at least one prerequisite required)
      if (prereqGroups.has("OR")) {
        const orPrereqs = prereqGroups.get("OR");
        if (orPrereqs && orPrereqs.length > 0) {
          let hasOnePrereq = false;
          for (const prereq of orPrereqs) {
            if (passedCourseSet.has(prereq) || plannedCourseSet.has(prereq)) {
              hasOnePrereq = true;
              break;
            }
          }
          if (!hasOnePrereq) {
            return false;
          }
        }
      }

      return true;
    }

    // Process remaining requirements first (highest priority)
    const availableCourses: SemesterAvailableCourses = [];
    const processedCourses = new Set<string>();

    // Process required courses & retakes
    for (const req of results.remainingReqs) {
      if (!req.courseCode) continue;

      // Skip if can't be retaken
      if (cantRetakeMap.get(req.courseCode)) continue;

      // Check prerequisites
      if (!hasPrerequisitesMet(req.courseCode)) continue;

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

      if (!hasPrerequisitesMet(courseCode)) continue;

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

      if (!hasPrerequisitesMet(course.code)) continue;

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
