// Define the enum for student course status
import { pgEnum } from "drizzle-orm/pg-core";

export const studentCourseStatusValues = [
  "verified",
  "enrolled",
  "planned",
  "retake_required",
  "dropped",
  "failed",
] as const;

export type StudentCourseStatus = (typeof studentCourseStatusValues)[number];
export const studentCourseStatusEnum = pgEnum(
  "student_course_status",
  studentCourseStatusValues
);
