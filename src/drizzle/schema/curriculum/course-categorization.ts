import { InferSelectModel } from "drizzle-orm";
import { boolean, integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { mathTracks } from "@/drizzle/schema/academic-structure/math-tracks";
import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

import { courseCategories } from "./course-categories";
import { courses } from "./courses";

export const courseCategorization = pgTable("course_categorization", {
  id,
  // Core relationships
  courseCode: varchar("course_code")
    .notNull()
    .references(() => courses.code, { onDelete: "cascade" }),
  categoryName: varchar("category_name")
    .notNull()
    .references(() => courseCategories.name, { onDelete: "restrict" }),

  // Major handling - string-based approach for flexibility
  majorGroup: varchar("major_group", { length: 20 }),

  // Math track relationship for track-specific requirements
  mathTrackName: varchar("math_track_name").references(() => mathTracks.name, {
    onDelete: "set null",
  }),

  // Core categorization properties
  isRequired: boolean("is_required").notNull().default(false),
  isFlexible: boolean("is_flexible").notNull().default(false),

  // For curriculum planning
  recommendedYear: integer("recommended_year"),
  recommendedSemester: integer("recommended_semester"),

  // For tracking requirement changes over time
  applicableFromCohortYear: integer("applicable_from_cohort_year"),
  applicableUntilCohortYear: integer("applicable_until_cohort_year"),

  createdAt,
  updatedAt,
});

export const courseCategorizationSchema = createInsertSchema(
  courseCategorization
).extend({
  courseCode: z.string(),
  categoryName: z.string(),
  majorGroup: z.string().max(20).optional().nullable(),
  mathTrackName: z.string().uuid().optional().nullable(),
  isRequired: z.boolean().default(false),
  isFlexible: z.boolean().default(false),
  recommendedYear: z.number().int().min(1).max(4).optional().nullable(),
  recommendedSemester: z.number().int().min(1).max(3).optional().nullable(), // 3 for summer
  applicableFromCohortYear: z.number().int().optional().nullable(),
  applicableUntilCohortYear: z.number().int().optional().nullable(),
});

export type CourseCategorizationInput = z.infer<
  typeof courseCategorizationSchema
>;
export type CourseCategoryMappingRecord = InferSelectModel<
  typeof courseCategorization
>;
