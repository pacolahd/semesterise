import { InferSelectModel } from "drizzle-orm";
import { pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { courses } from "@/drizzle/schema/curriculum/courses";
import { createdAt, updatedAt } from "@/drizzle/schema/helpers";

export const courseCodeHistory = pgTable("course_code_history", {
  // Primary key - the historical course code
  historicalCode: varchar("historical_code", { length: 20 })
    .notNull()
    .primaryKey(),

  // Foreign key to current course code
  currentCode: varchar("current_code", { length: 20 })
    .notNull()
    .references(() => courses.code, { onDelete: "restrict" }),

  // Optional tracking fields to match other tables
  createdAt,
  updatedAt,
});

export const courseCodeHistorySchema = createInsertSchema(
  courseCodeHistory
).extend({
  historicalCode: z.string().min(2).max(20),
  currentCode: z.string().min(2).max(20),
});

export type CourseCodeHistoryInput = z.infer<typeof courseCodeHistorySchema>;
export type CourseCodeHistoryRecord = InferSelectModel<
  typeof courseCodeHistory
>;
