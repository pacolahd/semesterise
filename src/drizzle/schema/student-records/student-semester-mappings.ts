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
  studentId: varchar("student_id", { length: 20 })
    .notNull()
    .references(() => studentProfiles.studentId, { onDelete: "cascade" }),
  academicSemesterId: uuid("academic_semester_id")
    .notNull()
    .references(() => academicSemesters.id, { onDelete: "cascade" }),
  programYear: integer("program_year"), // 1, 2, 3, or 4
  programSemester: integer("program_semester"), // 1 or 2
  isSummer: boolean("is_summer").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false), // Confirmed from transcript
  createdAt,
  updatedAt,
});

export const studentSemesterMappingSchema = createInsertSchema(
  studentSemesterMappings
).extend({
  studentId: z.string().min(1).max(20),
  academicSemesterId: z.string().uuid(),
  programYear: z.number().int().min(1).max(4).optional().nullable(),
  programSemester: z.number().int().min(1).max(2).optional().nullable(),
  isSummer: z.boolean().default(false),
  isVerified: z.boolean().default(false),
});

export type StudentSemesterMappingInput = z.infer<
  typeof studentSemesterMappingSchema
>;
export type StudentSemesterMappingRecord = InferSelectModel<
  typeof studentSemesterMappings
>;
