// src/lib/services/course-categorization-service.ts
import { and, eq, isNull, or } from "drizzle-orm";

import {
  courseCategories,
  courseCategorization,
  courses,
} from "@/drizzle/schema";

/**
 * Determine the appropriate category for a course
 */
export async function determineCategoryForCourse(
  courseCode: string,
  majorCode: string,
  tx: any
): Promise<string> {
  // Try to find a direct category match for this course code and major
  const categoryMapping = await tx.query.courseCategorization.findFirst({
    where: and(
      eq(courseCategorization.courseCode, courseCode),
      or(
        eq(courseCategorization.majorGroup, majorCode),
        eq(courseCategorization.majorGroup, "ALL"),
        isNull(courseCategorization.majorGroup)
      )
    ),
  });

  if (categoryMapping) {
    return categoryMapping.categoryName;
  }

  // If no category mapping found, use department code to guess
  const departmentCode = extractDepartmentCode(courseCode);

  // Standard categories based on department code
  switch (departmentCode) {
    case "CS":
    case "MIS":
      return majorCode === "CS" || majorCode === "Computer Science"
        ? "Major Required"
        : "Major Elective";
    case "MATH":
      return "Mathematics & Quantitative";
    case "HUMN":
    case "HIST":
    case "PHIL":
      return "Humanities & Social Sciences";
    case "ENGR":
      return majorCode.includes("Engineering")
        ? "Major Required"
        : "Engineering";
    case "BUSN":
    case "MGMT":
    case "ECON":
    case "ACCT":
    case "FINC":
      return majorCode === "Business Administration" || majorCode === "BA"
        ? "Major Required"
        : "Business Administration";
    case "SCI":
    case "BIOL":
    case "CHEM":
    case "PHYS":
      return "Natural Sciences";
    case "COMM":
    case "ENGL":
      return "Written & Oral Communication";
    case "INDS":
    case "LEAD":
    case "ETHN":
      return "Leadership & Ethics";
    default:
      return "Uncategorized";
  }
}

/**
 * Extract department code from course code (e.g., "CS" from "CS101")
 */
function extractDepartmentCode(courseCode: string): string {
  // Match letters at the beginning of the course code
  const match = courseCode.match(/^([A-Za-z]+)/);
  return match ? match[1].toUpperCase() : "UNKNOWN";
}
