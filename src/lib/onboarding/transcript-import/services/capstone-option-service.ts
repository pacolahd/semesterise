// src/lib/services/capstone-option-service.ts
import { TranscriptCourse } from "@/lib/onboarding/transcript-import/transcript-import-types";

/**
 * Determine the student's Capstone option based on courses taken. Default is Applied Project
 */
export function determineCapstoneOption(
  courses: TranscriptCourse[],
  majorCode: string
): string {
  const isEngineeringStudent = ["CE", "EE", "ME"].includes(majorCode || "");

  // Build a list of all course codes in uppercase for case-insensitive matching
  const courseCodes = courses.map((course) => course.code.toUpperCase().trim());

  // CORRECTED: Define course patterns for Undergraduate Thesis
  const undergraduateBAThesisCodePatterns = ["BUSA400A", "BUSA400B"];
  const undergraduateCSThesisCodePatterns = ["CS491", "CS492"];

  const entrepreneurshipCodePatterns = ["BUSA401A", "BUSA401B"];

  const appliedProjectCodePatterns = ["BUSA410"];

  const engineeringSeniorProjectCodePatterns = ["ENGR401"];

  const hasUndergraduateBAThesisCourse = courseCodes.some((code) =>
    undergraduateBAThesisCodePatterns.some((pattern) => code.includes(pattern))
  );
  const hasUndergraduateCSThesisCourse = courseCodes.some((code) =>
    undergraduateCSThesisCodePatterns.some((pattern) => code.includes(pattern))
  );

  const hasEntrepreneurshipCourse = courseCodes.some((code) =>
    entrepreneurshipCodePatterns.some((pattern) => code.includes(pattern))
  );

  const hasAppliedProjectCodeCourse = courseCodes.some((code) =>
    appliedProjectCodePatterns.some((pattern) => code.includes(pattern))
  );
  const hasEngineeringSeniorProjectCourse = courseCodes.some((code) =>
    engineeringSeniorProjectCodePatterns.some((pattern) =>
      code.includes(pattern)
    )
  );

  // Log what we found for debugging
  console.log("Math course detection:", {
    courseCodes,
    hasUndergraduateBAThesisCourse,
    hasUndergraduateCSThesisCourse,
    hasEntrepreneurshipCourse,
    hasAppliedProjectCodeCourse,
    hasEngineeringSeniorProjectCourse,
  });

  // Determine the track based on courses taken
  if (isEngineeringStudent) {
    return "Engineering Senior Project";
  } else if (hasUndergraduateBAThesisCourse) {
    return "Undergraduate BA Thesis";
  } else if (hasUndergraduateCSThesisCourse) {
    return "Undergraduate CS Thesis";
  } else if (hasEntrepreneurshipCourse) {
    return "Entrepreneurship";
  } else if (hasEngineeringSeniorProjectCourse) {
    return "Engineering Senior Project";
  } else if (hasAppliedProjectCodeCourse) {
    return "Applied Project";
  }
  // If no math courses are found, use the user's selection from onboarding
  // or default to Pre-Calculus as safer choice (student can change if needed)
  // console.log("\n\n\n\n\nDefaulting to Applied Project ohhh \n\n\n");
  return "Applied Project";
}
