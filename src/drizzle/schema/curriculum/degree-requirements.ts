import { InferSelectModel } from "drizzle-orm";
import { decimal, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import { majors } from "@/drizzle/schema/institution/majors";

import { courseCategories } from "./course-categories";

export const degreeRequirements = pgTable("degree_requirements", {
  id,
  // Core relationships
  majorCode: varchar("major_code")
    .notNull()
    .references(() => majors.code, { onDelete: "cascade" }),
  categoryName: varchar("category_name")
    .notNull()
    .references(() => courseCategories.name, { onDelete: "restrict" }),

  // Credit requirements
  minCredits: decimal("min_credits", { precision: 4, scale: 1 }).notNull(),
  maxCredits: decimal("max_credits", { precision: 4, scale: 1 }),

  // Course count requirements
  minCourses: integer("min_courses"),
  maxCourses: integer("max_courses"),

  // For tracking requirement changes over time
  applicableFromCohortYear: integer("applicable_from_cohort_year"),
  applicableUntilCohortYear: integer("applicable_until_cohort_year"),

  // Notes and special requirements
  notes: text("notes"),

  createdAt,
  updatedAt,
});

export const degreeRequirementSchema = createInsertSchema(
  degreeRequirements
).extend({
  majorCode: z.string(),
  categoryName: z.string(),
  minCredits: z.number().min(0).max(100),
  maxCredits: z.number().min(0).max(100).optional().nullable(),
  minCourses: z.number().int().min(0).optional().nullable(),
  maxCourses: z.number().int().min(0).optional().nullable(),
  applicableFromCohortYear: z.number().int().optional().nullable(),
  applicableUntilCohortYear: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type DegreeRequirementInput = z.infer<typeof degreeRequirementSchema>;
export type DegreeRequirementRecord = InferSelectModel<
  typeof degreeRequirements
>;
