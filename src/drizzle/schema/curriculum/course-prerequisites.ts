import { InferSelectModel } from "drizzle-orm";
import { pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

import { courses } from "./courses";

export const coursePrerequisites = pgTable("course_prerequisites", {
  id,
  courseCode: varchar("course_code")
    .notNull()
    .references(() => courses.code, { onDelete: "cascade" }),
  prerequisitecourseCode: varchar("prerequisite_course_code")
    .notNull()
    .references(() => courses.code, { onDelete: "restrict" }),
  createdAt,
  updatedAt,
});

export const coursePrerequisiteSchema = createInsertSchema(
  coursePrerequisites
).extend({
  courseCode: z.string(),
  prerequisitecourseCode: z.string(),
});

export type CoursePrerequisiteInput = z.infer<typeof coursePrerequisiteSchema>;
export type CoursePrerequisiteRecord = InferSelectModel<
  typeof coursePrerequisites
>;
