// src/lib/services/math-track-service.ts
import { TranscriptCourse } from "@/lib/types/transcript";

/**
 * Determine the student's math track based on courses taken
 *
 * MATH141/MATH142 = Calculus track
 * MATH121/MATH122 = Pre-Calculus track
 */
export function determineMathTrack(courses: TranscriptCourse[]): string {
  // Build a list of all course codes in uppercase for case-insensitive matching
  const courseCodes = courses.map((course) => course.code.toUpperCase().trim());
  const courseTitles = courses.map((course) =>
    course.title.toUpperCase().trim()
  );

  // CORRECTED: Define course patterns for calculus track
  const calculusCodePatterns = [
    "MATH141",
    "MATH142", // Correct Ashesi course codes for Calculus
    "MATH 141",
    "MATH 142",
  ];

  const calculusTitlePatterns = [
    "CALCULUS I",
    "CALCULUS II",
    "CALCULUS 1",
    "CALCULUS 2",
  ];

  // CORRECTED: Define course patterns for pre-calculus track
  const preCalculusCodePatterns = [
    "MATH121",
    "MATH122", // Correct Ashesi course codes for Pre-Calculus
    "MATH 121",
    "MATH 122",
  ];

  const preCalculusTitlePatterns = [
    "PRE-CALCULUS I",
    "PRE-CALCULUS II",
    "PRE-CALCULUS 1",
    "PRE-CALCULUS 2",
    "PRECALCULUS",
  ];

  // Check if the student has taken any calculus courses
  const hasCalculusCourse =
    courseCodes.some((code) =>
      calculusCodePatterns.some((pattern) => code.includes(pattern))
    ) ||
    courseTitles.some((title) =>
      calculusTitlePatterns.some((pattern) => title.includes(pattern))
    );

  // Check if the student has taken any pre-calculus courses
  const hasPreCalculusCourse =
    courseCodes.some((code) =>
      preCalculusCodePatterns.some((pattern) => code.includes(pattern))
    ) ||
    courseTitles.some((title) =>
      preCalculusTitlePatterns.some((pattern) => title.includes(pattern))
    );

  // Log what we found for debugging
  console.log("Math course detection:", {
    courseCodes,
    hasCalculusCourse,
    hasPreCalculusCourse,
  });

  // Determine the track based on courses taken
  if (hasCalculusCourse) {
    return "Calculus";
  } else if (hasPreCalculusCourse) {
    return "Pre-Calculus";
  }

  // If no math courses are found, use the user's selection from onboarding
  // or default to Pre-Calculus as safer choice (student can change if needed)
  return "Pre-Calculus";
}
