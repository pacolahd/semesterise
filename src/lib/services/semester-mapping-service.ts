// src/lib/services/semester-mapping-service.ts
import { AcademicInfo } from "@/lib/stores/onboarding-store";
import { SemesterMapping, TranscriptSemester } from "@/lib/types/transcript";

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
 * Map CAMU semesters to program years
 */
export async function processSemesterMappings(
  semesters: TranscriptSemester[],
  academicInfo: AcademicInfo
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

  // Map to program years based on current year and semester
  const currentYear = parseInt(academicInfo.currentYear);
  const currentSemester =
    academicInfo.currentSemester === "Fall"
      ? 1
      : academicInfo.currentSemester === "Spring"
        ? 2
        : 3;

  // Count backward from current position to determine program years
  const mappings: SemesterMapping[] = [];

  // Calculate how many regular semesters we are from the beginning
  let regularSemestersFromBeginning =
    (currentYear - 1) * 2 + (currentSemester <= 2 ? currentSemester - 1 : 2);

  sortedSemesters.forEach((semester, index) => {
    const academicYear = extractAcademicYear(semester.name);
    const semesterNumber = extractSemesterNumber(semester.name);

    // Determine if this is a summer semester
    // Special case for 2023-2024: Semester 3 is a regular semester
    const isSummer =
      semesterNumber === 3 && !academicYear.includes("2023-2024");

    // If it's the most recent semester, use the academicInfo values directly
    if (index === sortedSemesters.length - 1) {
      mappings.push({
        camuSemesterName: semester.name,
        academicYearRange: academicYear,
        programYear: currentYear,
        programSemester: currentSemester <= 2 ? currentSemester : 1, // Convert summer to fall if needed
        isSummer: currentSemester === 3 && !academicYear.includes("2023-2024"),
        courseCount: semester.courses.length,
      });
      return;
    }

    // Calculate how many regular semesters this semester is from the beginning
    let semestersFromBeginning =
      regularSemestersFromBeginning - (sortedSemesters.length - index - 1);

    // Adjust for summer semesters
    const previousSemesters = sortedSemesters.slice(0, index);
    const summerSemesterCount = previousSemesters.filter(
      (s) =>
        extractSemesterNumber(s.name) === 3 &&
        !extractAcademicYear(s.name).includes("2023-2024")
    ).length;

    semestersFromBeginning -= summerSemesterCount;

    // Calculate program year and semester
    const programYear = Math.floor(semestersFromBeginning / 2) + 1;
    const programSemester = (semestersFromBeginning % 2) + 1;

    mappings.push({
      camuSemesterName: semester.name,
      academicYearRange: academicYear,
      programYear: Math.max(1, programYear), // Ensure minimum of Year 1
      programSemester: isSummer ? 0 : programSemester, // 0 for summer
      isSummer,
      courseCount: semester.courses.length,
    });
  });

  return mappings;
}
