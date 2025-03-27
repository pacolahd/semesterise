import { InferSelectModel } from "drizzle-orm";
import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

import { courses } from "./courses";
import { prerequisiteGroups } from "./prerequisite-groups";

export const prerequisiteCourses = pgTable("prerequisite_courses", {
  id,
  groupKey: varchar("group_key", { length: 100 })
    .notNull()
    .references(() => prerequisiteGroups.groupKey, { onDelete: "cascade" }),
  prerequisiteCourseCode: varchar("prerequisite_course_code", { length: 20 })
    .notNull()
    .references(() => courses.code, { onDelete: "restrict" }),
  courseMinimumGrade: varchar("course_minimum_grade", { length: 2 }),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt,
  updatedAt,
});

export const prerequisiteCourseSchema = createInsertSchema(
  prerequisiteCourses
).extend({
  groupKey: z.string().min(3).max(100),
  prerequisiteCourseCode: z.string().min(2).max(20),
  courseMinimumGrade: z.string().max(2).optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export type PrerequisiteCourseInput = z.infer<typeof prerequisiteCourseSchema>;
export type PrerequisiteCourseRecord = InferSelectModel<
  typeof prerequisiteCourses
>;
