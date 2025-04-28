// src/lib/academic-plan/prerequisite-utility.ts
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  courses,
  prerequisiteCourses,
  prerequisiteGroups,
} from "@/drizzle/schema";

import {
  MissingPrerequisite,
  PrerequisiteCheckResult,
  PrerequisiteCourse,
  PrerequisiteData,
  PrerequisiteGroup,
} from "./types";

// Cache for prerequisite data with 24-hour expiration
const prerequsiteCache = new Map<
  string,
  {
    data: PrerequisiteData;
    timestamp: number;
  }
>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Load and cache ALL prerequisite data for the entire system
 */
export async function loadAllPrerequisiteData(): Promise<PrerequisiteData> {
  const cacheKey = "ALL_PREREQUISITES";
  const now = Date.now();
  const cached = prerequsiteCache.get(cacheKey);

  // Return cached data if valid
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Load all data in a single transaction
  const result = await db.transaction(async (tx) => {
    // Get all prerequisite groups
    const groups = await tx.query.prerequisiteGroups.findMany();

    // Get all prerequisite courses with their group relationships
    const prereqCourses = await tx
      .select({
        groupKey: prerequisiteCourses.groupKey,
        prerequisiteCourseCode: prerequisiteCourses.prerequisiteCourseCode,
      })
      .from(prerequisiteCourses);

    // Get all course titles for better error messages
    const allCourses = await tx
      .select({
        code: courses.code,
        title: courses.title,
      })
      .from(courses);

    return { groups, prereqCourses, allCourses };
  });

  // Process the raw data into our optimized structure
  const data: PrerequisiteData = {
    courseToGroups: new Map(),
    groupToCourses: new Map(),
    groups: new Map(),
    courseTitles: new Map(),
  };

  // Process groups
  for (const group of result.groups) {
    const prereqGroup: PrerequisiteGroup = {
      groupKey: group.groupKey,
      courseCode: group.courseCode,
      groupName: group.groupName || group.groupKey,
      description: group.description,
      externalLogicOperator: (group.externalLogicOperator || "AND") as
        | "AND"
        | "OR",
      internalLogicOperator: (group.internalLogicOperator || "OR") as
        | "AND"
        | "OR",
      isConcurrent: group.isConcurrent || false,
      isRecommended: group.isRecommended || false,
      applicableMajorCode: group.applicableMajorCode, // Include applicable major code
    };

    // Add to groups map
    data.groups.set(group.groupKey, prereqGroup);

    // Add to courseToGroups map
    if (!data.courseToGroups.has(group.courseCode)) {
      data.courseToGroups.set(group.courseCode, []);
    }
    data.courseToGroups.get(group.courseCode)!.push(prereqGroup);
  }

  // Process prerequisite courses
  for (const prereqCourse of result.prereqCourses) {
    if (!prereqCourse.prerequisiteCourseCode) continue;

    // Add to groupToCourses map
    if (!data.groupToCourses.has(prereqCourse.groupKey)) {
      data.groupToCourses.set(prereqCourse.groupKey, []);
    }

    data.groupToCourses.get(prereqCourse.groupKey)!.push({
      groupKey: prereqCourse.groupKey,
      courseCode: prereqCourse.prerequisiteCourseCode,
    });
  }

  // Process course titles
  for (const course of result.allCourses) {
    data.courseTitles.set(course.code, course.title || course.code);
  }

  // Cache the processed data
  prerequsiteCache.set(cacheKey, { data, timestamp: now });

  return data;
}

/**
 * Core prerequisite checking function that handles both internal and external logic
 * Now accounts for major-specific prerequisites
 */
export function checkPrerequisites(
  courseCode: string,
  availableCourses: Set<string>,
  prereqData: PrerequisiteData,
  studentMajorCode?: string
): PrerequisiteCheckResult {
  // Get all prerequisite groups for this course
  const allGroups = prereqData.courseToGroups.get(courseCode) || [];

  // Filter groups to only include those applicable to this student's major
  // A group applies if:
  // 1. It has no applicableMajorCode (applies to all majors), OR
  // 2. Its applicableMajorCode matches the student's major
  const groups = allGroups.filter(
    (group) =>
      !group.applicableMajorCode ||
      !studentMajorCode ||
      group.applicableMajorCode === studentMajorCode
  );

  // If no prerequisites, return true immediately
  if (groups.length === 0) {
    return { courseCode, isMet: true };
  }

  // Split groups by external logic operator
  const andGroups = groups.filter(
    (g) =>
      g.externalLogicOperator === "AND" && !g.isConcurrent && !g.isRecommended
  );

  const orGroups = groups.filter(
    (g) =>
      g.externalLogicOperator === "OR" && !g.isConcurrent && !g.isRecommended
  );

  // Track missing prerequisites for helpful error messages
  const missingPrerequisites: MissingPrerequisite[] = [];

  // Check all AND groups - every group must be satisfied
  let allAndGroupsMet = true;
  for (const group of andGroups) {
    const prereqCourses = prereqData.groupToCourses.get(group.groupKey) || [];

    // Check if group is satisfied based on internal logic operator
    let groupSatisfied = false;
    if (group.internalLogicOperator === "AND") {
      // Every course in the group must be available
      groupSatisfied = prereqCourses.every((course) =>
        availableCourses.has(course.courseCode)
      );
    } else {
      // At least one course in the group must be available
      groupSatisfied = prereqCourses.some((course) =>
        availableCourses.has(course.courseCode)
      );
    }

    if (!groupSatisfied) {
      allAndGroupsMet = false;

      // Add to missing prerequisites
      missingPrerequisites.push({
        groupName: group.groupName,
        groupKey: group.groupKey,
        courses: prereqCourses.map((c) => ({
          ...c,
          title: prereqData.courseTitles.get(c.courseCode),
        })),
        internalLogicOperator: group.internalLogicOperator,
        requiredCount:
          group.internalLogicOperator === "AND" ? prereqCourses.length : 1,
        satisfiedCount: prereqCourses.filter((course) =>
          availableCourses.has(course.courseCode)
        ).length,
        applicableMajorCode: group.applicableMajorCode, // Include in missing prerequisites
      });
    }
  }

  // Check OR groups - at least one group must be satisfied
  let anyOrGroupMet = orGroups.length === 0; // Default true if no OR groups

  if (orGroups.length > 0) {
    const orGroupResults: MissingPrerequisite[] = [];

    for (const group of orGroups) {
      const prereqCourses = prereqData.groupToCourses.get(group.groupKey) || [];

      // Check if group is satisfied based on internal logic operator
      let groupSatisfied = false;
      if (group.internalLogicOperator === "AND") {
        // Every course in the group must be available
        groupSatisfied = prereqCourses.every((course) =>
          availableCourses.has(course.courseCode)
        );
      } else {
        // At least one course in the group must be available
        groupSatisfied = prereqCourses.some((course) =>
          availableCourses.has(course.courseCode)
        );
      }

      if (groupSatisfied) {
        anyOrGroupMet = true;
        break; // One satisfied OR group is enough
      }

      // Track missing prerequisites
      orGroupResults.push({
        groupName: group.groupName,
        groupKey: group.groupKey,
        courses: prereqCourses.map((c) => ({
          ...c,
          title: prereqData.courseTitles.get(c.courseCode),
        })),
        internalLogicOperator: group.internalLogicOperator,
        requiredCount:
          group.internalLogicOperator === "AND" ? prereqCourses.length : 1,
        satisfiedCount: prereqCourses.filter((course) =>
          availableCourses.has(course.courseCode)
        ).length,
        applicableMajorCode: group.applicableMajorCode, // Include in missing prerequisites
      });
    }

    // If no OR groups were satisfied, add them all to missing prerequisites
    if (!anyOrGroupMet) {
      missingPrerequisites.push(...orGroupResults);
    }
  }

  // Prerequisites met only if all AND groups AND at least one OR group are satisfied
  const allPrerequisitesMet = allAndGroupsMet && anyOrGroupMet;

  // Generate user-friendly error message
  let infoMessage = undefined;
  if (!allPrerequisitesMet) {
    infoMessage = generatePrerequisiteMessage(missingPrerequisites, prereqData);
  }

  return {
    courseCode,
    isMet: allPrerequisitesMet,
    missingPrerequisites: allPrerequisitesMet
      ? undefined
      : missingPrerequisites,
    infoMessage: allPrerequisitesMet ? undefined : infoMessage,
  };
}

/**
 * Generate a user-friendly message explaining missing prerequisites
 * Enhanced to include major-specific information when relevant
 */
function generatePrerequisiteMessage(
  missingPrereqs: MissingPrerequisite[],
  prereqData: PrerequisiteData
): string {
  if (!missingPrereqs || missingPrereqs.length === 0) {
    return "Prerequisites not met";
  }

  return missingPrereqs
    .map((group) => {
      const coursesWithTitles = group.courses.map((c) => {
        const title = prereqData.courseTitles.get(c.courseCode) || c.courseCode;
        return `"${c.courseCode} - ${title}"`;
      });

      // Include major-specific information if applicable
      const majorInfo = group.applicableMajorCode
        ? ` [For ${group.applicableMajorCode} majors]`
        : "";

      if (group.requiredCount) {
        return `${group.groupName}${majorInfo}: You must complete ${coursesWithTitles}`;
      } else if (group.internalLogicOperator === "AND") {
        return `${group.groupName}${majorInfo}: You need all of these courses: ${coursesWithTitles.join(", ")}`;
      } else {
        return `${group.groupName}${majorInfo}: You need at least one of these courses: ${coursesWithTitles.join(", ")}`;
      }
    })
    .join("; ");
}

/**
 * Convenience function for when you just need a boolean result
 */
export async function arePrerequisitesMet(
  courseCode: string,
  availableCourses: Set<string>,
  studentMajorCode?: string
): Promise<boolean> {
  const prereqData = await loadAllPrerequisiteData();
  return checkPrerequisites(
    courseCode,
    availableCourses,
    prereqData,
    studentMajorCode
  ).isMet;
}

/**
 * Calculate available courses based on passed and planned courses
 * This is useful for multiple prerequisite checks
 */
export function getAvailableCourses(
  passedCourses: Set<string>,
  plannedCourses: { courseCode: string; year: number; semester: number }[],
  targetYear: number,
  targetSemester: number
): Set<string> {
  // Start with all passed courses
  const availableCourses = new Set([...passedCourses]);

  // Add planned courses that come before the target semester
  for (const planned of plannedCourses) {
    if (!planned.courseCode) continue;

    const isBeforeTarget =
      planned.year < targetYear ||
      (planned.year === targetYear && planned.semester < targetSemester);

    if (isBeforeTarget) {
      availableCourses.add(planned.courseCode);
    }
  }

  return availableCourses;
}
