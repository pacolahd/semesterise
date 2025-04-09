// src/lib/types/transcript.ts
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
  ca: string;
  cr: string;
  cp: string;
  gp: string;
  gpa: string;
  cgpa: string;
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
