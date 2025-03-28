// ["academic_advisor", "hod", "provost", "registry", "lecturer"]
// src/drizzle/schema/institution/enums.ts
import { pgEnum } from "drizzle-orm/pg-core";

export const staffRoleValues = [
  "academic_advisor",
  "hod",
  "provost",
  "registry",
  "lecturer",
] as const;

// Create a TypeScript type for type safety
export type StaffRole = (typeof staffRoleValues)[number];

// Define the actual Drizzle enum
export const staffRoleEnum = pgEnum("staff_role", staffRoleValues);
