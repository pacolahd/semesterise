// src/lib/services/course-categorization-service.ts
import { and, eq, isNull, or } from "drizzle-orm";

import {
  courseCategories,
  courseCategorization,
  courses,
} from "@/drizzle/schema";

/**
 * Determine the appropriate category for a course based on the course code and student's major
 * by looking up the mapping in the course-categorizations table
 */
export async function determineCategoryForCourse(
  courseCode: string,
  majorCode: string,
  tx: any
): Promise<string> {
  // Clean the course code - remove any spaces
  const cleanCourseCode = courseCode.replace(/\s+/g, "");

  // Look for a direct match with the student's major

  const engStatus =
    majorCode === "CS" || majorCode === "MIS" || majorCode === "BA"
      ? "ENG"
      : "NON-ENG";
  let categoryMapping = await tx.query.courseCategorization.findFirst({
    where: and(
      eq(courseCategorization.courseCode, cleanCourseCode),
      or(
        eq(courseCategorization.majorGroup, majorCode),
        eq(courseCategorization.majorGroup, engStatus),
        eq(courseCategorization.majorGroup, "ALL")
      )
    ),
  });

  // If a specific mapping was found, use it
  if (categoryMapping) {
    return categoryMapping.categoryName;
  }

  // If still no mapping found, try to determine based on course prefix
  // Extract the department code from the course code
  const departmentCode = extractDepartmentCode(cleanCourseCode);

  // Map department code to appropriate categories based on provided info
  switch (departmentCode) {
    // Computer Science and Information Systems (CSIS) Department
    case "CS":
      return majorCode === "CS" ? "Required Major Classes" : "Computing";
    case "IS":
    case "CSIS":
    case "AI":
    case "MS":
    case "SYS":
      return "Computing";
    case "MATH":
      return "Mathematics & Quantitative";

    // Business Administration Department
    case "BUSA":
    case "ECON":
      return "Business";

    // Engineering Department
    case "ENGR":
    case "CE":
    case "EE":
    case "ME":
      return majorCode.includes("E")
        ? "Required Major Classes"
        : "Non-Major Electives";
    case "CHEM":
    case "SC":
      return "Science";

    // Humanities and Social Sciences Department
    case "AS":
    case "ENGL":
    case "FRENC":
    case "POLS":
    case "SOAN":
      return "Humanities & Social Sciences";

    default:
      return "Non-Major Electives"; // Default fallback
  }
}

/**
 * Extract department code from course code (e.g., "CS" from "CS101")
 */
function extractDepartmentCode(courseCode: string): string {
  // Match letters at the beginning of the course code
  const match = courseCode.match(/^([A-Za-z]+)/);
  return match ? match[1].toUpperCase() : "";
}
