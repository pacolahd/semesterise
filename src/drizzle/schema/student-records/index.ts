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
  studentRequiredCoursesView,
  type StudentRequiredCoursesRecord,
} from "./views/student-required-courses-view";

export {
  studentCourseStatusView,
  type StudentCourseStatusRecord,
} from "./views/student-course-status-view";

export {
  studentDegreeRequirementProgressView,
  type StudentDegreeRequirementProgressRecord,
} from "./views/student-degree-requirement-progress-view";

// Relations
export * from "./relations";

// Enums
export { studentCourseStatusEnum } from "./enums";
