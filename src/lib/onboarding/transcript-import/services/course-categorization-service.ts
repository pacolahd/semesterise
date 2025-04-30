// src/lib/services/course-categorization-service.ts
import { and, eq, isNull, or, sql } from "drizzle-orm";

import {
  courseCategories,
  courseCategorization,
  courses,
} from "@/drizzle/schema";

/**
 * Determine the appropriate category for a course based on the course code and student's major
 * by looking up the mapping in the course-categorizations table with proper priority handling
 */
export async function determineCategoryForCourse(
  courseCode: string,
  majorCode: string,
  tx: any
): Promise<string> {
  // Clean the course code - remove any spaces
  const cleanCourseCode = courseCode.replace(/\s+/g, "");

  // Determine the student's major group
  const isEngineeringMajor = ["CE", "EE", "ME"].includes(majorCode);
  const majorGroup = isEngineeringMajor ? "ENG" : "NON-ENG";

  // First try to find an exact categorization match with priority order
  const categoryMapping = await tx.query.courseCategorization.findFirst({
    where: and(
      eq(courseCategorization.courseCode, cleanCourseCode),
      or(
        eq(courseCategorization.majorGroup, majorCode), // Exact major match
        eq(courseCategorization.majorGroup, "ALL"), // Universal requirements
        eq(courseCategorization.majorGroup, majorGroup) // Major group (ENG/NON-ENG)
      )
    ),
    orderBy: [
      // Priority 1: Exact major match
      sql`CASE WHEN ${courseCategorization.majorGroup} = ${majorCode} THEN 1 ELSE 2 END`,
      // Priority 2: ALL requirements
      sql`CASE WHEN ${courseCategorization.majorGroup} = 'ALL' THEN 1 ELSE 2 END`,
      // Priority 3: Major group matches
      sql`CASE WHEN ${courseCategorization.majorGroup} = ${majorGroup} THEN 1 ELSE 2 END`,
    ],
  });

  // Return found categorization if exists
  if (categoryMapping) {
    return categoryMapping.categoryName;
  }

  // Fallback to code-based heuristic categorization
  const code = extractCode(cleanCourseCode);

  // Enhanced code mapping with clearer logic
  const codeCategories: Record<string, string> = {
    // Computer Science and Information Systems
    CS: isEngineeringMajor ? "Computing" : "Required Major Classes",
    IS: "Computing",
    CSIS: "Computing",
    AI: "Computing",
    MS: "Computing",
    SYS: "Computing",

    // Mathematics
    MATH: "Mathematics & Quantitative",

    // Business
    BUSA: "Business",
    ECON: "Business",

    // Engineering (only for engineering majors)
    ENGR: isEngineeringMajor ? "Required Major Classes" : "Non-Major Electives",
    CE: isEngineeringMajor ? "Required Major Classes" : "Non-Major Electives",
    EE: isEngineeringMajor ? "Required Major Classes" : "Non-Major Electives",
    ME: isEngineeringMajor ? "Required Major Classes" : "Non-Major Electives",

    // Sciences
    CHEM: "Science",
    SC: "Science",

    // Humanities
    AS: "Humanities & Social Sciences",
    ENGL: "Humanities & Social Sciences",
    FRENC: "Humanities & Social Sciences",
    POLS: "Humanities & Social Sciences",
    SOAN: "Humanities & Social Sciences",
  };

  return codeCategories[code] || "Non-Major Electives";
}

/**
 * Extract code from course code (e.g., "CS" from "CS101")
 */
function extractCode(courseCode: string): string {
  // Match letters at the beginning of the course code
  const match = courseCode.match(/^([A-Za-z]+)/);
  return match ? match[1].toUpperCase() : "";
}
