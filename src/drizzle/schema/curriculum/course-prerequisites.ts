import { InferSelectModel } from "drizzle-orm";
import { pgTable, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

import { courses } from "./courses";

export const coursePrerequisites = pgTable("course_prerequisites", {
  id,
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  prerequisiteCourseId: uuid("prerequisite_course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "restrict" }),
  createdAt,
  updatedAt,
});

export const coursePrerequisiteSchema = createInsertSchema(
  coursePrerequisites
).extend({
  courseId: z.string().uuid(),
  prerequisiteCourseId: z.string().uuid(),
});

export type CoursePrerequisiteInput = z.infer<typeof coursePrerequisiteSchema>;
export type CoursePrerequisiteRecord = InferSelectModel<
  typeof coursePrerequisites
>;
