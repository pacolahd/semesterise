// src/lib/services/transcript-validation.ts
import { TranscriptData } from "@/lib/onboarding/transcript-import/transcript-import-types";

/**
 * Validates that parsed data actually contains transcript information
 * Returns validation result with error details if invalid
 *
 * Verifies the parsed data contains essential transcript components:
 *
 * - Student information (name, ID)
 * - Semester data
 * - Course data with expected structure
 * - GPA information
 *
 *
 * Checks for CAMU-specific patterns to ensure it's actually a transcript
 *
 * Provides detailed error messages about what's missing
 *
 * Returns a confidence score for how likely this is a valid CAMU transcript
 *
 */
export function validateTranscriptContent(data: any): {
  valid: boolean;
  error?: string;
  details?: string;
} {
  // First check if the data object exists
  if (!data) {
    return {
      valid: false,
      error: "No data was extracted from the file",
      details:
        "The uploaded file could not be parsed or contains no data. Please ensure you're uploading a valid transcript export from CAMU.",
    };
  }

  // Check for studentInfo
  if (!data.studentInfo) {
    return {
      valid: false,
      error: "Missing student information",
      details:
        "The file doesn't contain basic student information. Please ensure you're uploading a complete transcript export from CAMU.",
    };
  }

  // Check for student ID
  if (!data.studentInfo.student_roll_no && !data.studentInfo.student_id) {
    return {
      valid: false,
      error: "Missing student ID",
      details:
        "The file doesn't contain your student ID. Please ensure you're uploading a complete transcript export.",
    };
  }

  // Check if student name exists
  if (!data.studentInfo.name) {
    return {
      valid: false,
      error: "Missing student name",
      details:
        "The file doesn't contain your name. Please ensure you're uploading a complete transcript export.",
    };
  }

  // Check for semesters array
  if (
    !data.semesters ||
    !Array.isArray(data.semesters) ||
    data.semesters.length === 0
  ) {
    return {
      valid: false,
      error: "No semester data found",
      details:
        "The transcript doesn't contain any semester information. Please ensure you're uploading a complete academic transcript export.",
    };
  }

  // Check first semester to ensure it has expected structure
  const firstSemester = data.semesters[0];
  if (
    !firstSemester.name ||
    !firstSemester.courses ||
    !Array.isArray(firstSemester.courses)
  ) {
    return {
      valid: false,
      error: "Invalid semester data structure",
      details:
        "The semester data in the transcript is incomplete or malformed. Please ensure you're exporting the transcript correctly from CAMU.",
    };
  }

  // Check for at least one course
  if (firstSemester.courses.length === 0) {
    return {
      valid: false,
      error: "No course data found",
      details:
        "The transcript doesn't contain any course information. Please ensure you're uploading a complete academic transcript with course data.",
    };
  }

  // Check first course structure
  const firstCourse = firstSemester.courses[0];
  if (
    !firstCourse.code ||
    !firstCourse.title ||
    !("credits" in firstCourse) ||
    !("grade" in firstCourse)
  ) {
    return {
      valid: false,
      error: "Invalid course data structure",
      details:
        "The course data in the transcript is incomplete or malformed. A valid transcript should include course codes, titles, credits, and grades.",
    };
  }

  // Check for GPA information
  if (!firstSemester.gpaInfo) {
    return {
      valid: false,
      error: "Missing GPA information",
      details:
        "The transcript doesn't contain GPA information. Please ensure you're uploading a complete academic transcript.",
    };
  }

  // All checks passed
  return { valid: true };
}

/**
 * More detailed validation focusing on structure and content markers specific to CAMU
 * This can help identify if a file is actually from CAMU or not
 */
export function validateCAMUTranscript(data: any): {
  isCAMU: boolean;
  confidence: number;
  reasons: string[];
} {
  let confidence = 0;
  const reasons: string[] = [];

  // Check for CAMU-specific fields or patterns
  if (data.studentInfo?.degree && typeof data.studentInfo.degree === "string") {
    confidence += 20;
    reasons.push("Contains degree information");
  }

  if (data.studentInfo?.date_of_admission) {
    confidence += 15;
    reasons.push("Contains admission date");
  }

  if (
    data.semesters &&
    data.semesters.some(
      (s: any) => s.name && /semester\s+\d+\s+\d{4}-\d{4}/i.test(s.name)
    )
  ) {
    confidence += 25;
    reasons.push("Contains CAMU-formatted semester names");
  }

  // Check GPA structure typical of CAMU
  if (
    data.semesters &&
    data.semesters[0]?.gpaInfo &&
    "cgpa" in data.semesters[0].gpaInfo &&
    "gpa" in data.semesters[0].gpaInfo
  ) {
    confidence += 20;
    reasons.push("Contains CAMU-style GPA information");
  }

  // Check for CAMU-specific grading format
  if (
    data.semesters &&
    data.semesters[0]?.courses &&
    data.semesters[0].courses.some(
      (c: any) => c.grade && /^[A-F][+\-]?$/.test(c.grade)
    )
  ) {
    confidence += 20;
    reasons.push("Contains CAMU-style course grades");
  }

  return {
    isCAMU: confidence >= 60, // Consider it CAMU if confidence is over 60%
    confidence,
    reasons,
  };
}
