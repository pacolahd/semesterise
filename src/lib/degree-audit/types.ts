// src/lib/degree-audit/types.ts

export type CourseStatus =
  | "PLANNED" // For future courses
  | "ENROLLED" // For current courses
  | "FAILED" // For failed courses
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "C-"
  | "D+"
  | "D"
  | "D-"
  | "F"; // Grades for completed courses

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  description?: string;
  tooltip?: string; // Additional info for hover
  status: CourseStatus;
  category: string; // For category view grouping
  grade?: string; // For failed courses to show the actual grade
  minGrade?: string; // For failed courses to show the minimum passing grade
  prerequisites?: string[];
}

export interface Semester {
  id: string;
  name: string; // "Fall", "Spring", "Summer"
  courses: Course[];
  gpa?: number;
  creditWarning?: boolean;
}

export interface Year {
  id: string;
  yearNumber: number; // 1, 2, 3, 4
  semesters: Semester[];
}

export interface AcademicPlan {
  studentId: string;
  years: Year[];
  programName: string;
  totalCredits: number;
  completedCredits: number;
  inProgressCredits: number;
  gpa?: number;
}
