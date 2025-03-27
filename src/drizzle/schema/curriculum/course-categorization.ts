import { InferSelectModel } from "drizzle-orm";
import { boolean, integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import { majors } from "@/drizzle/schema/institution/majors";

import { courseCategories } from "./course-categories";
import { courses } from "./courses";

export const courseCategorization = pgTable("course_categorization", {
  id,
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => courseCategories.id, { onDelete: "restrict" }),
  majorId: uuid("major_id").references(() => majors.id, {
    onDelete: "restrict",
  }),
  isRequired: boolean("is_required").notNull().default(false),
  isFlexible: boolean("is_flexible").notNull().default(false),
  recommendedYear: integer("recommended_year"),
  recommendedSemester: integer("recommended_semester"),
  applicableFromCohortYear: integer("applicable_from_cohort_year"),
  applicableUntilCohortYear: integer("applicable_until_cohort_year"),
  createdAt,
  updatedAt,
});

export const courseCategorizationSchema = createInsertSchema(
  courseCategorization
).extend({
  courseId: z.string().uuid(),
  categoryId: z.string().uuid(),
  majorId: z.string().uuid().optional().nullable(),
  isRequired: z.boolean().default(false),
  isFlexible: z.boolean().default(false),
  recommendedYear: z.number().int().min(1).max(4).optional().nullable(),
  recommendedSemester: z.number().int().min(1).max(2).optional().nullable(),
  applicableFromCohortYear: z.number().int().optional().nullable(),
  applicableUntilCohortYear: z.number().int().optional().nullable(),
});

export type CourseCategorization = z.infer<typeof courseCategorizationSchema>;
export type CourseCategoryMappingRecord = InferSelectModel<
  typeof courseCategorization
>;
