import { InferSelectModel } from "drizzle-orm";
import { decimal, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import { majors } from "@/drizzle/schema/institution/majors";

import { courseCategories } from "./course-categories";

export const degreeRequirements = pgTable("degree_requirements", {
  id,
  majorId: uuid("major_id")
    .notNull()
    .references(() => majors.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => courseCategories.id, { onDelete: "restrict" }),
  minCredits: decimal("min_credits", { precision: 4, scale: 1 }).notNull(),
  maxCredits: decimal("max_credits", { precision: 4, scale: 1 }),
  minCourses: integer("min_courses"),
  maxCourses: integer("max_courses"),
  applicableFromCohortYear: integer("applicable_from_cohort_year"),
  applicableUntilCohortYear: integer("applicable_until_cohort_year"),
  notes: text("notes"),
  createdAt,
  updatedAt,
});

export const degreeRequirementSchema = createInsertSchema(
  degreeRequirements
).extend({
  majorId: z.string().uuid(),
  categoryId: z.string().uuid(),
  minCredits: z.number().min(0).max(100),
  maxCredits: z.number().min(0).max(100).optional().nullable(),
  minCourses: z.number().int().min(0).optional().nullable(),
  maxCourses: z.number().int().min(0).optional().nullable(),
  applicableFromCohortYear: z.number().int().optional().nullable(),
  applicableUntilCohortYear: z.number().int().optional().nullable(),
});

export type DegreeRequirementInput = z.infer<typeof degreeRequirementSchema>;
export type DegreeRequirementRecord = InferSelectModel<
  typeof degreeRequirements
>;
