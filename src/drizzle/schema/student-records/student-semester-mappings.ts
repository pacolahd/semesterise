// src/drizzle/schema/student-records/student-semester-mappings.ts
import { InferSelectModel } from "drizzle-orm";
import { boolean, integer, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { academicSemesters } from "@/drizzle/schema";
import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import { studentProfiles } from "@/drizzle/schema/student-records/student-profiles";

export const studentSemesterMappings = pgTable("student_semester_mappings", {
  id,
  student_id: varchar("student_id", { length: 20 })
    .notNull()
    .references(() => studentProfiles.studentId, { onDelete: "cascade" }),
  academic_semester_id: uuid("academic_semester_id")
    .notNull()
    .references(() => academicSemesters.id, { onDelete: "cascade" }),
  program_year: integer("program_year"), // 1, 2, 3, or 4
  program_semester: integer("program_semester"), // 1 or 2
  is_summer: boolean("is_summer").notNull().default(false),
  is_verified: boolean("is_verified").notNull().default(false), // Confirmed from transcript
  createdAt,
  updatedAt,
});

export const studentSemesterMappingSchema = createInsertSchema(
  studentSemesterMappings
).extend({
  student_id: z.string().min(1).max(20),
  academic_semester_id: z.string().uuid(),
  program_year: z.number().int().min(1).max(4).optional().nullable(),
  program_semester: z.number().int().min(1).max(2).optional().nullable(),
  is_summer: z.boolean().default(false),
  is_verified: z.boolean().default(false),
});

export type StudentSemesterMappingInput = z.infer<
  typeof studentSemesterMappingSchema
>;
export type StudentSemesterMappingRecord = InferSelectModel<
  typeof studentSemesterMappings
>;
