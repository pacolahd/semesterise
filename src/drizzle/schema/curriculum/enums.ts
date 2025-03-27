import { pgEnum } from "drizzle-orm/pg-core";

// Define enum values as a TypeScript array (for type safety)
export const courseStatusValues = [
  "active",
  "archived",
  "development",
] as const;

// Create a TypeScript type for type safety
export type CourseStatus = (typeof courseStatusValues)[number];

// Define the actual Drizzle enum
export const courseStatusEnum = pgEnum("course_status", courseStatusValues);

export const semesterOfferingValues = ["fall", "sprint", "summer"] as const;
export type SemesterOffering = (typeof semesterOfferingValues)[number];
export const semesterOfferingEnum = pgEnum(
  "semester_offering",
  semesterOfferingValues
);
