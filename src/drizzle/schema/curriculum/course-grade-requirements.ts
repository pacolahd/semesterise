import { InferSelectModel } from "drizzle-orm";
import { integer, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import { majors } from "@/drizzle/schema/institution/majors";

import { courses } from "./courses";

export const courseGradeRequirements = pgTable("course_grade_requirements", {
  id,
  majorId: uuid("major_id")
    .notNull()
    .references(() => majors.id, { onDelete: "cascade" }),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  minimumGrade: varchar("minimum_grade", { length: 2 }).notNull(),
  applicableFromCohortYear: integer("applicable_from_cohort_year"),
  applicableUntilCohortYear: integer("applicable_until_cohort_year"),
  description: varchar("description", { length: 255 }),
  createdAt,
  updatedAt,
});

export const courseGradeRequirementSchema = createInsertSchema(
  courseGradeRequirements
).extend({
  majorId: z.string().uuid(),
  courseId: z.string().uuid(),
  minimumGrade: z.string().min(1).max(2),
  applicableFromCohortYear: z.number().int().optional().nullable(),
  applicableUntilCohortYear: z.number().int().optional().nullable(),
  description: z.string().max(255),
});

export type CourseGradeRequirementInput = z.infer<
  typeof courseGradeRequirementSchema
>;
export type CourseGradeRequirementRecord = InferSelectModel<
  typeof courseGradeRequirements
>;
