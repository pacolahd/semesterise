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
  const undergraduateThesisCodePatterns = ["BUSA400A", "BUSA400B"];

  const entrepreneurshipCodePatterns = ["BUSA401A", "BUSA401B"];

  const appliedProjectCodePatterns = ["BUSA410"];

  const engineeringSeniorProjectCodePatterns = ["BUSA410"];

  // Check if the student has taken any calculus courses
  const hasUndergraduateThesisCourse = courseCodes.some((code) =>
    undergraduateThesisCodePatterns.some((pattern) => code.includes(pattern))
  );

  // Check if the student has taken any pre-calculus courses
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
    hasUndergraduateThesisCourse,
    hasEntrepreneurshipCourse,
    hasAppliedProjectCodeCourse,
    hasEngineeringSeniorProjectCourse,
  });

  // Determine the track based on courses taken
  if (isEngineeringStudent) {
    return "Engineering Senior Project";
  } else if (hasUndergraduateThesisCourse) {
    return "Undergraduate Thesis";
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
