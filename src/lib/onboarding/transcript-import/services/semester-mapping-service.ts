// src/lib/services/semester-mapping-service.ts
import { AcademicInfo } from "@/lib/onboarding/onboarding-store";
import {
  SemesterMapping,
  TranscriptSemester,
} from "@/lib/onboarding/transcript-import/transcript-import-types";

/**
 * Extract academic year from CAMU semester name (e.g., "Semester 1 2021-2022")
 */
export function extractAcademicYear(semesterName: string): string {
  // Look for a pattern like 2021-2022 or 2021/2022
  const yearPattern = /\d{4}[-\/]\d{4}/;
  const match = semesterName.match(yearPattern);

  if (match) {
    return match[0].replace("/", "-"); // Normalize to yyyy-yyyy format
  }

  // If not found, attempt alternative extraction from name
  const yearDigits = semesterName.match(/\d{4}/g);
  if (yearDigits && yearDigits.length >= 2) {
    return `${yearDigits[0]}-${yearDigits[1]}`;
  }

  // Fallback to current academic year
  const currentYear = new Date().getFullYear();
  return `${currentYear - 1}-${currentYear}`;
}

/**
 * Extract semester number from CAMU semester name (e.g., "Semester 1 2021-2022")
 */
export function extractSemesterNumber(semesterName: string): number {
  const semPattern = /semester\s+(\d+)/i;
  const match = semesterName.match(semPattern);

  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  // Default to semester 1 if not found
  return 1;
}

/**
 * Check if a semester is a summer semester based on academic year and semester number
 * Special case for 2023-2024: Semester 3 is NOT a summer semester
 */
export function isSummerSemester(semesterName: string): boolean {
  const semNumber = extractSemesterNumber(semesterName);
  const academicYear = extractAcademicYear(semesterName);

  // Special case: Semester 3 2023-2024 is NOT a summer semester
  if (semNumber === 3 && academicYear === "2023-2024") {
    return false;
  }

  // Otherwise, Semester 3 is typically a summer semester
  return semNumber === 3;
}

/**
 * NEW SIMPLIFIED APPROACH: Simply count sequential semesters from the first one in the transcript
 *
 * This approach treats the first semester in the transcript as Year 1, Semester 1,
 * regardless of its academic year/semester designation in CAMU
 */
export async function processSemesterMappings(
  semesters: TranscriptSemester[],
  academicInfo: AcademicInfo,
  admissionDate?: string
): Promise<SemesterMapping[]> {
  // Sort semesters chronologically
  const sortedSemesters = [...semesters].sort((a, b) => {
    // Parse academic years for comparison
    const yearA = extractAcademicYear(a.name);
    const yearB = extractAcademicYear(b.name);

    // If years are different, sort by year
    if (yearA !== yearB) {
      const startYearA = parseInt(yearA.split("-")[0]);
      const startYearB = parseInt(yearB.split("-")[0]);
      return startYearA - startYearB;
    }

    // If years are the same, sort by semester number
    const semNumA = extractSemesterNumber(a.name);
    const semNumB = extractSemesterNumber(b.name);
    return semNumA - semNumB;
  });

  // Create mappings for each semester with sequential program years/semesters
  const mappings: SemesterMapping[] = [];

  // Keep track of the current program year and semester
  let currentProgramYear = 1;
  let currentProgramSemester = 1;

  // Process each semester in chronological order
  for (let i = 0; i < sortedSemesters.length; i++) {
    const semester = sortedSemesters[i];
    const academicYear = extractAcademicYear(semester.name);
    const semesterNumber = extractSemesterNumber(semester.name);
    const isSummer = isSummerSemester(semester.name);

    // Add the mapping
    mappings.push({
      camuSemesterName: semester.name,
      academicYearRange: academicYear,
      programYear: currentProgramYear,
      programSemester: isSummer ? 0 : currentProgramSemester,
      isSummer,
      courseCount: semester.courses.length,
    });

    // If it's not a summer semester, prepare for the next regular semester
    if (!isSummer) {
      // Increment program semester
      currentProgramSemester++;

      // If we've completed a year (2 semesters), move to the next year
      if (currentProgramSemester > 2) {
        currentProgramYear++;
        currentProgramSemester = 1;
      }
    }
  }

  return mappings;
}
