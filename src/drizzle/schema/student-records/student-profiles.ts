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
  student_id: varchar("student_id", { length: 20 }).unique(),

  // Reference to BetterAuth user
  authId: uuid("auth_id")
    .primaryKey()
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),

  // Domain-specific fields
  major_code: varchar("major_code").references(() => majors.code, {
    onDelete: "restrict",
  }),
  math_track_name: varchar("math_track_name").references(
    () => mathTracks.name,
    { onDelete: "set null" }
  ),
  entry_year: integer("entry_year"),

  // Graduation year
  cohort_year: integer("cohort_year"),
  current_year: integer("current_year"),
  current_semester: varchar("current_semester", { length: 20 }),
  expectedGraduationDate: date("expected_graduation_date"),
  cumulative_gpa: decimal("cumulative_gpa", { precision: 3, scale: 2 }),
  total_credits_earned: decimal("total_credits_earned", {
    precision: 5,
    scale: 1,
  }).default("0"),
  capstone_option_id: varchar("capstone_option_id").references(
    () => capstoneOptions.name,
    { onDelete: "set null" }
  ),
  isActive: boolean("is_active").default(true),
  onboarding_completed: boolean("onboarding_completed").default(false),
  createdAt,
  updatedAt,
});

export const studentProfileSchema = createInsertSchema(studentProfiles).extend({
  student_id: z.string().min(1).max(20),
  authId: z.string().uuid(),
  major_code: z.string(),
  math_track_name: z.string().optional().nullable(),
  entry_year: z.number().int().positive(),
  cohort_year: z.number().int().positive(),
  current_year: z.number().int().min(1).max(4),
  current_semester: z.string().max(20),
  expected_graduation_date: z.date().optional().nullable(),
  cumulative_gpa: z.number().min(0).max(4).step(0.01).optional().nullable(),
  total_credits_earned: z.number().min(0).step(0.1).default(0),
  capstone_option_id: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  onboarding_completed: z.boolean().default(false),
});

// For validation (auth, API input)
export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
// For database results
export type StudentProfileRecord = InferSelectModel<typeof studentProfiles>;
