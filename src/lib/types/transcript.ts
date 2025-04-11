// src/lib/types/transcript.ts - Extended version
import { AcademicInfo, ProgramInfo } from "@/lib/stores/onboarding-store";

export interface TranscriptStudentInfo {
  student_id: string;
  name: string;
  date_of_admission: string;
  faculty: string;
  degree: string;
  [key: string]: string; // Allow for additional fields
}

export interface TranscriptCourse {
  code: string;
  title: string;
  credits: number;
  grade: string;
  semester?: string; // Added for convenience
}

export interface TranscriptGPAInfo {
  ca: string; // Credits attempted
  cr: string; // Credits registered
  cp: string; // Credits passed
  gp: string; // Grade points
  gpa: string; // Grade point average
  cgpa: string; // Cumulative GPA
}

export interface TranscriptSemester {
  name: string;
  courses: TranscriptCourse[];
  gpaInfo: TranscriptGPAInfo;
}

export interface TranscriptData {
  studentInfo: TranscriptStudentInfo;
  currentCredits?: string;
  semesters: TranscriptSemester[];
  enhancedData?: {
    allCourses?: TranscriptCourse[];
    totalCredits?: number;
    completedCredits?: number;
    completionPercentage?: number;
  };
}

// New types for the import process

export interface SemesterMapping {
  camuSemesterName: string;
  academicYearRange: string; // e.g., "2021-2022"
  programYear: number; // 1-4
  programSemester: number; // 1-2
  isSummer: boolean;
  courseCount: number;
  academicSemesterId?: string; // Reference to the academic_semester record
}

export interface CourseWithCategory extends TranscriptCourse {
  categoryName: string;
  semesterId?: string; // The ID of the academic_semester from the database
  isUsedForRequirement?: boolean;
  isFailed?: boolean;
  needsRetake?: boolean;
}

export interface TranscriptImportRequest {
  transcriptData: TranscriptData;
  academicInfo: AcademicInfo;
  programInfo: ProgramInfo;
  authId?: string; // Used by the server-side to identify the user
}

export interface TranscriptImportResult {
  success: boolean;
  studentId?: string;
  processingId?: string;
  mappings?: SemesterMapping[];
  studentProfile?: StudentProfileData;
  requiresVerification?: boolean;
  error?: string;
  importedCoursesCount?: number;
  verificationToken?: string; // Used to authenticate the verification step
}

// Student profile data from transcript
export interface StudentProfileData {
  studentId: string;
  name: string;
  major: string;
  mathTrackName?: string;
  cumulativeGpa?: string;
  creditHours?: number;
  dateOfAdmission?: string;
  yearGroup?: string;
  currentYear?: number;
  currentSemester?: number;
  isVerified?: boolean;
}

// Processing visualization types
export interface ImportProgressState {
  phase: number;
  stage: number;
  statusMessage?: string;
  error?: string;
}

// For verification dialogs
export interface VerificationData {
  mappings: SemesterMapping[];
  studentProfile: StudentProfileData;
  token: string; // For securing the verification API call
}

// Detailed mapping update request
export interface MappingUpdateRequest {
  studentId: string;
  token: string;
  mappings: SemesterMapping[];
}

// Mapping update response
export interface MappingUpdateResponse {
  success: boolean;
  message?: string;
  updatedMappingIds?: string[];
  error?: string;
}
