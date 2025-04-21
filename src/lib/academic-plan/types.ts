// src/lib/academic-plan/types.ts

export type CourseStatus = "completed" | "failed" | "planned";

export type CourseCategory = {
  name: string;
  parentName: string;
  color: string;
};

export type CourseWithStatus = {
  // Core identifiers
  id: string;
  courseCode: string;
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
};

export type Semester = {
  year: number;
  semester: number;
  isSummer: boolean;
  name: string;
  courses: CourseWithStatus[];
  totalCredits: number;
  hasCreditWarning: boolean;
};

export type YearPlan = {
  studentId: string;
  majorCode: string;
  mathTrack?: string;
  capstoneOption?: string;

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
