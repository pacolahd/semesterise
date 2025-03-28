// src/drizzle/schema/petition-system/petition-courses.ts
import { InferSelectModel } from "drizzle-orm";
import { pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { academicSemesters } from "@/drizzle/schema/academic-structure/academic-semesters";
import { courses } from "@/drizzle/schema/curriculum/courses";
import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import { petitions } from "@/drizzle/schema/petition-system/petitions";

export const petitionCourses = pgTable("petition_courses", {
  id,
  petitionId: uuid("petition_id")
    .notNull()
    .references(() => petitions.id, { onDelete: "cascade" }),
  courseCode: varchar("course_code", { length: 20 })
    .notNull()
    .references(() => courses.code, { onDelete: "restrict" }),
  action: varchar("action", { length: 50 }).notNull(), // 'add', 'drop', 'retake', 'audit', 'waive_prerequisite'
  reason: text("reason"),
  currentGrade: varchar("current_grade", { length: 5 }),
  targetSemesterId: uuid("target_semester_id").references(
    () => academicSemesters.id,
    { onDelete: "set null" }
  ),
  createdAt,
  updatedAt,
});

export const petitionCourseSchema = createInsertSchema(petitionCourses).extend({
  petitionId: z.string().uuid(),
  courseCode: z.string().min(2).max(20),
  action: z.enum(["add", "drop", "retake", "audit", "waive_prerequisite"]),
  reason: z.string().optional().nullable(),
  currentGrade: z.string().max(5).optional().nullable(),
  targetSemesterId: z.string().uuid().optional().nullable(),
});

export type PetitionCourseInput = z.infer<typeof petitionCourseSchema>;
export type PetitionCourseRecord = InferSelectModel<typeof petitionCourses>;
