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
  student_id: varchar("student_id", { length: 20 })
    .notNull()
    .references(() => studentProfiles.studentId, { onDelete: "cascade" }),
  warning_type: varchar("warning_type", { length: 50 }).notNull(),
  course_code: varchar("course_code", { length: 20 }).references(
    () => courses.code,
    { onDelete: "set null" }
  ),
  semester_id: uuid("semester_id").references(() => academicSemesters.id, {
    onDelete: "set null",
  }),
  category_name: varchar("category_name").references(
    () => courseCategories.name,
    { onDelete: "set null" }
  ),
  severity: varchar("severity", { length: 20 }).notNull(),
  message: text("message").notNull(),
  recommendation: text("recommendation"),
  is_resolved: boolean("is_resolved").default(false),
  resolution_notes: text("resolution_notes"),
  createdAt,
  updatedAt,
});

export const academicWarningSchema = createInsertSchema(
  academicWarnings
).extend({
  student_id: z.string().min(1).max(20),
  warning_type: z.string().max(50),
  course_code: z.string().max(20).optional().nullable(),
  semester_id: z.string().uuid().optional().nullable(),
  category_name: z.string().optional().nullable(),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string(),
  recommendation: z.string().optional().nullable(),
  is_resolved: z.boolean().default(false),
  resolution_notes: z.string().optional().nullable(),
});

export type AcademicWarningInput = z.infer<typeof academicWarningSchema>;
export type AcademicWarningRecord = InferSelectModel<typeof academicWarnings>;
