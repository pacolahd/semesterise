// src/drizzle/schema/student-records/student-profiles.ts
import { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  integer,
  pgTable,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { capstoneOptions, majors, mathTracks } from "@/drizzle/schema";
import { authUsers } from "@/drizzle/schema/auth";
import { createdAt, updatedAt } from "@/drizzle/schema/helpers";

export const studentProfiles = pgTable("student_profiles", {
  // Keep the existing school-issued ID as the primary key
  studentId: varchar("student_id", { length: 20 }).unique(),

  // Reference to BetterAuth user
  authId: uuid("auth_id")
    .primaryKey()
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),

  // Domain-specific fields
  majorCode: varchar("major_code").references(() => majors.code, {
    onDelete: "restrict",
  }),
  mathTrackName: varchar("math_track_name").references(() => mathTracks.name, {
    onDelete: "set null",
  }),
  entryYear: integer("entry_year"),

  // Graduation year
  cohortYear: integer("cohort_year"),
  currentYear: integer("current_year"),
  currentSemester: varchar("current_semester", { length: 20 }),
  expectedGraduationDate: date("expected_graduation_date"),
  cumulativeGpa: decimal("cumulative_gpa", { precision: 3, scale: 2 }),
  totalCreditsEarned: decimal("total_credits_earned", {
    precision: 5,
    scale: 1,
  }).default("0"),
  capstoneOptionName: varchar("capstone_option_name").references(
    () => capstoneOptions.name,
    { onDelete: "set null" }
  ),
  isActive: boolean("is_active").default(true),
  createdAt,
  updatedAt,
});

export const studentProfileSchema = createInsertSchema(studentProfiles).extend({
  studentId: z.string().min(1).max(20),
  authId: z.string().uuid(),
  majorCode: z.string(),
  mathTrackName: z.string().optional().nullable(),
  entryYear: z.number().int().positive(),
  cohortYear: z.number().int().positive(),
  currentYear: z.number().int().min(1).max(4),
  currentSemester: z.string().max(20),
  expectedGraduationDate: z.date().optional().nullable(),
  cumulativeGpa: z.number().min(0).max(4).step(0.01).optional().nullable(),
  totalCreditsEarned: z.number().min(0).step(0.1).default(0),
  capstoneOptionName: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// For validation (auth, API input)
export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
// For database results
export type StudentProfileRecord = InferSelectModel<typeof studentProfiles>;
