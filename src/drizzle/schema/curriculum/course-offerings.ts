import { InferSelectModel } from "drizzle-orm";
import { integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import {
  semesterOfferingEnum,
  semesterOfferingValues,
} from "@/drizzle/schema/curriculum/enums";
import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

import { courses } from "./courses";

export const courseOfferings = pgTable("course_offerings", {
  id,
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  offeredInSemester: semesterOfferingEnum("offered_in_semester").notNull(),
  createdAt,
  updatedAt,
});

export const courseOfferingSchema = createInsertSchema(courseOfferings).extend({
  courseId: z.string().uuid(),
  offeredInSemester: z.enum(semesterOfferingValues), // Using the enum values
});

export type CourseOfferingInput = z.infer<typeof courseOfferingSchema>;
export type CourseOfferingRecord = InferSelectModel<typeof courseOfferings>;
