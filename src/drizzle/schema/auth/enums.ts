// src/drizzle/schema/institution/enums.ts
import { pgEnum } from "drizzle-orm/pg-core";

// user roles
export const userRoleValues = [
  "academic_advisor",
  "hod",
  "provost",
  "registry",
  "lecturer",
  "student",
] as const;

// Enum mapping for easier usage
export const userRoles = {
  academic_advisor: "academic_advisor",
  hod: "hod",
  provost: "provost",
  lecturer: "lecturer",
  registry: "registry",
  student: "student",
} as const;

// TypeScript type for type safety
export type UserRole = (typeof userRoleValues)[number];

// Define the actual Drizzle enum
export const userRoleEnum = pgEnum("staff_role", userRoleValues);

// User types
export const userTypeValues = ["student", "staff"] as const;

// Enum mapping for easier usage
export const userTypes = {
  student: "student",
  staff: "staff",
} as const;

// TypeScript type for type safety
export type UserType = (typeof userTypeValues)[number];

// Define the actual Drizzle enum
export const userTypeEnum = pgEnum("user_type", userTypeValues);
