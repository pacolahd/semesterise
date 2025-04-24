// src/lib/academic-plan/types.ts
import { StudentSemesterMappingRecord } from "@/drizzle/schema/student-records/student-semester-mappings";

export type CourseStatus = "completed" | "failed" | "planned";

export type CourseCategory = {
  name: string;
  parentName: string;
  color: string;
};

export type CourseWithStatus = {
  // Core identifiers
  id: string;
  courseCode: string | null; // Can be null for placeholders

  courseTitle: string;

  // Academic info
  credits: number;
  category: CourseCategory;
  departmentCode: string;

  // Status info
  status: CourseStatus;
  grade?: string;
  minGradeRequired?: string;

  // Retake info
  retakeNeeded: boolean;
  isLatestAttempt: boolean;
  totalAttempts: number;

  // Semester placement
  year: number;
  semester: number;
  isSummer: boolean;

  // UI specific data
  infoMessage?: string;
  hasWarning: boolean;

  // Flag for placeholder electives
  isPlaceholder?: boolean;
};

export type Semester = {
  year: number;
  semester: number;
  isSummer?: boolean;
  name?: string;
  courses: CourseWithStatus[];
  totalCredits: number;
  hasCreditWarning?: boolean;
};

export type YearPlan = {
  studentId: string;
  majorCode: string;
  mathTrack?: string;
  capstoneOption?: string;
  currentYear: number;
  currentSemester: number;

  years: {
    [year: number]: {
      fall: Semester;
      spring: Semester;
      summer?: Semester;
    };
  };

  totalCreditsCompleted: number;
  totalCreditsRemaining: number;
  percentageComplete: number;
  lastUpdated: Date;
};

export type PrerequisiteCheckResult = {
  courseCode: string;
  isMet: boolean;
  missingPrerequisites?: {
    groupName: string;
    courses: string[];
    requiredCount: number;
    satisfiedCount: number;
  }[];
  infoMessage?: string;
};

export type SemesterAvailableCourses = {
  code: string;
  title: string;
  credits: number;
  category: string;
  offeredInSemester?: boolean;
}[];

export type CourseAvailability = {
  isOffered: boolean;
  warning?: string;
};

export type SemesterCreditsResponse = {
  existing: number;
  new: number;
  total: number;
};

export type CoursePlacementValidationResponse = {
  isValid: boolean;
  studentProfile?: any;
  semesterMapping?: StudentSemesterMappingRecord | null;
  errors: string[];
  warnings: string[];
};

// Type definition for the placement summary
export interface PlacementSummary {
  totalPlaced: number;
  retakesPlaced: number;
  requiredPlaced: number;
  electivesPlaced: number;
  semesterPlacements: Record<
    string,
    {
      year: number;
      semester: number;
      semesterName: string;
      credits: number;
      courses: {
        code: string | null;
        title: string;
        credits: number;
        type: "Retake" | "Required" | "Elective";
      }[];
    }
  >;
  unplacedCourses: {
    code?: string;
    title: string;
    reason: string;
  }[];
}

// New type for elective placeholders
export type ElectivePlaceholder = {
  title: string;
  credits: number;
  category?: string;
};
