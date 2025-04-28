// src/lib/academic-plan/prerequisite-utility.ts
import { db } from "@/drizzle";
import {
  courses,
  prerequisiteCourses,
  prerequisiteGroups,
} from "@/drizzle/schema";

import { CACHE_TTL } from "./constants";
import {
  MissingPrerequisite,
  PrerequisiteCheckResult,
  PrerequisiteCourse,
  PrerequisiteData,
  PrerequisiteGroup,
} from "./types";

// Global cache for prerequisite data
const prerequisiteCache = new Map<
  string,
  {
    data: PrerequisiteData;
    timestamp: number;
  }
>();

/**
 * Load and cache ALL prerequisite data for the entire system
 * This is the core optimization for prerequisite checking
 */
export async function loadAllPrerequisiteData(): Promise<PrerequisiteData> {
  const cacheKey = "ALL_PREREQUISITES";
  const now = Date.now();
  const cached = prerequisiteCache.get(cacheKey);

  // Return cached data if valid
  if (cached && now - cached.timestamp < CACHE_TTL.PREREQUISITE_DATA) {
    return cached.data;
  }

  // Load all data in a single transaction to reduce DB round trips
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

  // Process the raw data into optimized data structures for fast lookups
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
      applicableMajorCode: group.applicableMajorCode,
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

  // Cache the processed data with timestamp
  prerequisiteCache.set(cacheKey, { data, timestamp: now });

  return data;
}

/**
 * Core prerequisite checking function with enhanced major-specific logic
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
        applicableMajorCode: group.applicableMajorCode,
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
        applicableMajorCode: group.applicableMajorCode,
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
 * Helper to generate user-friendly prerequisite error messages
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

      const majorInfo = group.applicableMajorCode
        ? ` [For ${group.applicableMajorCode} majors]`
        : "";
      if (group.requiredCount) {
        return `Prerequisite issue: You must complete ${coursesWithTitles}`;
      } else if (group.internalLogicOperator === "AND") {
        return `Prerequisite issue: You need all of these courses: ${coursesWithTitles.join(", ")}`;
      } else {
        return `Prerequisite issue: You need at least one of these courses: ${coursesWithTitles.join(", ")}`;
      }
    })
    .join("; ");
}

/**
 * Calculate available courses based on passed and planned courses
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
