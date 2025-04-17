// src/drizzle/schema/curriculum/placeholder-courses.ts
import { sql } from "drizzle-orm";
import { numeric, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

import { courseCategories } from "./course-categories";

export const placeholderCourses = pgTable("placeholder_courses", {
  id,
  code: varchar("code", { length: 20 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  categoryName: varchar("category_name", { length: 100 })
    .notNull()
    .references(() => courseCategories.name),
  credits: numeric("credits", { precision: 3, scale: 1 }).notNull(),
  description: text("description"),
  createdAt,
  updatedAt,
});

// Zod schemas for both INSERT and SELECT
export const placeholderCourseSchema = createInsertSchema(placeholderCourses);
export const selectPlaceholderCourseSchema =
  createSelectSchema(placeholderCourses);

// Types derived purely from Zod
export type PlaceholderCourseInput = z.infer<typeof placeholderCourseSchema>;
export type PlaceholderCourseRecord = z.infer<
  typeof selectPlaceholderCourseSchema
>;
