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

export const majorGroupValues = [
  "ALL",
  "CS",
  "NON-ENG",
  "MIS",
  "BA",
  "ENG",
  "CE",
  "EE",
  "ME",
] as const;

// Create a TypeScript type for type safety
export type MajorGroup = (typeof majorGroupValues)[number];

// Define the actual Drizzle enum
export const majorGroupEnum = pgEnum("major_group", majorGroupValues);

export const semesterOfferingValues = ["fall", "spring", "summer"] as const;
export type SemesterOffering = (typeof semesterOfferingValues)[number];
export const semesterOfferingEnum = pgEnum(
  "semester_offering",
  semesterOfferingValues
);
