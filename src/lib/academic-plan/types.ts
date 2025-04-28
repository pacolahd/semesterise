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
  isSummer: boolean;
  name: string;
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
      summer: Semester;
    };
  };

  totalCreditsCompleted: number;
  totalCreditsRemaining: number;
  percentageComplete: number;
  lastUpdated: Date;
};

export type SemesterAvailableCourses = {
  code: string;
  title: string;
  credits: number;
  category: string;
  offeredInSemester?: boolean;
  isRetake?: boolean;
  retakeReason?: string;
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

// Define types for the response
export type RemainingRequirementSummary = {
  totalRequirements: number;
  totalCredits: number;
  retakesNeeded: number;
  categories: {
    [category: string]: {
      name: string;
      remainingCourses: number;
      remainingCredits: number;
      highPriority: RemainingRequirement[];
    };
  };
  highPriorityRequirements: RemainingRequirement[];
  allRequirements: RemainingRequirement[];
};

export type RemainingRequirement = {
  courseCode: string | null;
  courseTitle: string;
  credits: number;
  parentCategory: string;
  categoryName: string;
  subCategory: string | null;
  recommendedYear: number | null;
  recommendedSemester: number | null;
  offeredInSemesters: string[] | null;
  requirementType: string;
  priorityOrder: number;
  isRetake: boolean;
};

/**
 * Structures for prerequisite data
 */
export interface PrerequisiteData {
  // Maps course codes to their prerequisite group keys
  courseToGroups: Map<string, PrerequisiteGroup[]>;
  // Maps group keys to prerequisite course information
  groupToCourses: Map<string, PrerequisiteCourse[]>;
  // All group information indexed by group key
  groups: Map<string, PrerequisiteGroup>;
  // All courses with name information for better error messages
  courseTitles: Map<string, string>;
}

// Update the PrerequisiteGroup and MissingPrerequisite interfaces to include applicableMajorCode
export interface PrerequisiteGroup {
  groupKey: string;
  courseCode: string;
  groupName: string;
  description: string | null;
  externalLogicOperator: "AND" | "OR";
  internalLogicOperator: "AND" | "OR";
  isConcurrent: boolean;
  isRecommended: boolean;
  applicableMajorCode: string | null; // Add this field for major-specific prerequisites
}

export interface MissingPrerequisite {
  groupName: string;
  groupKey: string;
  courses: PrerequisiteCourse[];
  internalLogicOperator: "AND" | "OR";
  requiredCount: number;
  satisfiedCount: number;
  applicableMajorCode?: string | null; // Add this field to show which major this prerequisite applies to
}

export interface PrerequisiteCourse {
  groupKey: string;
  courseCode: string;
  title?: string;
}

export interface PrerequisiteCheckResult {
  courseCode: string;
  isMet: boolean;
  missingPrerequisites?: MissingPrerequisite[];
  infoMessage?: string;
}
