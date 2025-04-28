import { InferSelectModel } from "drizzle-orm";
import { boolean, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, updatedAt } from "@/drizzle/schema/helpers";

import { courses } from "./courses";

export const prerequisiteGroups = pgTable("prerequisite_groups", {
  // Unique identifier for this group
  groupKey: varchar("group_key", { length: 100 }).notNull().primaryKey(),

  // Which course this prerequisite group belongs to
  courseCode: varchar("course_code", { length: 20 })
    .notNull()
    .references(() => courses.code, { onDelete: "cascade" }),

  // Group metadata
  groupName: varchar("group_name", { length: 100 }).notNull(),
  description: text("description"),

  // Logic operators
  externalLogicOperator: varchar("external_logic_operator", { length: 10 })
    .notNull()
    .default("AND"), // How this group combines with other groups
  internalLogicOperator: varchar("internal_logic_operator", { length: 10 })
    .notNull()
    .default("OR"), // How courses within this group combine

  // Special flags
  isConcurrent: boolean("is_concurrent").notNull().default(false), // Can be taken at the same time
  isRecommended: boolean("is_recommended").notNull().default(false), // Not strictly required

  // Grade requirements
  groupMinimumGrade: varchar("group_minimum_grade", { length: 2 }),

  // Display ordering
  sortOrder: integer("sort_order").notNull().default(0),

  // For non-course requirements (e.g., "Junior standing")
  nonCourseRequirement: text("non_course_requirement"),

  // major to which this requirement applies
  applicableMajorCode: varchar("applicable_major_code", { length: 10 }),

  // For cohort-specific requirements
  cohortYearStart: integer("cohort_year_start"),
  cohortYearEnd: integer("cohort_year_end"),

  createdAt,
  updatedAt,
});

export const prerequisiteGroupSchema = createInsertSchema(
  prerequisiteGroups
).extend({
  groupKey: z.string().min(3).max(100),
  courseCode: z.string().min(2).max(20),
  groupName: z.string().min(3).max(100),
  externalLogicOperator: z.enum(["AND", "OR"]).default("AND"),
  internalLogicOperator: z.enum(["AND", "OR"]).default("OR"),
  isConcurrent: z.boolean().default(false),
  isRecommended: z.boolean().default(false),
  groupMinimumGrade: z.string().max(2).optional().nullable(),
  sortOrder: z.number().int().default(0),
  description: z.string().optional().nullable(),
  nonCourseRequirement: z.string().optional().nullable(),
  cohortYearStart: z.number().int().optional().nullable(),
  cohortYearEnd: z.number().int().optional().nullable(),
});

export type PrerequisiteGroupInput = z.infer<typeof prerequisiteGroupSchema>;
export type PrerequisiteGroupRecord = InferSelectModel<
  typeof prerequisiteGroups
>;
