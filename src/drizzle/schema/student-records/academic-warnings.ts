// src/drizzle/schema/student-records/academic-warnings.ts
import { InferSelectModel } from "drizzle-orm";
import { boolean, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { academicSemesters, courseCategories, courses } from "@/drizzle/schema";
import { createdAt, updatedAt } from "@/drizzle/schema/helpers";
import { studentProfiles } from "@/drizzle/schema/student-records/student-profiles";

export const academicWarnings = pgTable("academic_warnings", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  studentId: varchar("student_id", { length: 20 })
    .notNull()
    .references(() => studentProfiles.studentId, { onDelete: "cascade" }),
  warningType: varchar("warning_type", { length: 50 }).notNull(),
  courseCode: varchar("course_code", { length: 20 }).references(
    () => courses.code,
    { onDelete: "set null" }
  ),
  semesterId: uuid("semester_id").references(() => academicSemesters.id, {
    onDelete: "set null",
  }),
  categoryName: varchar("category_name").references(
    () => courseCategories.name,
    { onDelete: "set null" }
  ),
  severity: varchar("severity", { length: 20 }).notNull(),
  message: text("message").notNull(),
  recommendation: text("recommendation"),
  isResolved: boolean("is_resolved").default(false),
  resolutionNotes: text("resolution_notes"),
  createdAt,
  updatedAt,
});

export const academicWarningSchema = createInsertSchema(
  academicWarnings
).extend({
  studentId: z.string().min(1).max(20),
  warningType: z.string().max(50),
  courseCode: z.string().max(20).optional().nullable(),
  semesterId: z.string().uuid().optional().nullable(),
  categoryName: z.string().optional().nullable(),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string(),
  recommendation: z.string().optional().nullable(),
  isResolved: z.boolean().default(false),
  resolutionNotes: z.string().optional().nullable(),
});

export type AcademicWarningInput = z.infer<typeof academicWarningSchema>;
export type AcademicWarningRecord = InferSelectModel<typeof academicWarnings>;
