// src/drizzle/schema/student-records/index.ts
// Tables
export { studentProfiles, studentProfileSchema } from "./student-profiles";
export {
  studentSemesterMappings,
  studentSemesterMappingSchema,
} from "./student-semester-mappings";
export { studentCourses, studentCourseSchema } from "./student-courses";
export { academicWarnings, academicWarningSchema } from "./academic-warnings";

// Views
export {
  semesterCreditSummariesView,
  type SemesterCreditSummary,
} from "./views/semester-credit-summaries-view";
export {
  categoryProgressView,
  type CategoryProgress,
} from "./views/category-progress-view";
export {
  studentGraduationProgressView,
  type StudentGraduationProgress,
} from "./views/student-graduation-progress-view";
export {
  studentCapstoneSelections,
  studentCapstoneSelectionSchema,
} from "./student-capstone-selections";

// Relations
export * from "./relations";

// Enums
export { studentCourseStatusEnum } from "./enums";
