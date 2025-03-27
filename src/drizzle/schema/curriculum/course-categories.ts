import { InferSelectModel } from "drizzle-orm";
import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, updatedAt } from "@/drizzle/schema/helpers";

// First, create the table without the self-reference
export const courseCategories = pgTable("course_categories", {
  name: varchar("name", { length: 100 }).notNull().primaryKey(),
  // We'll add the parentCategoryId later
  parentCategoryName: varchar("parent_category_name"),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt,
  updatedAt,
});

export const courseCategorySchema = createInsertSchema(courseCategories).extend(
  {
    name: z.string().min(3).max(100),
    parentCategoryName: z.string().optional().nullable(),
    displayOrder: z.number().int().default(0),
  }
);

export type CourseCategoryInput = z.infer<typeof courseCategorySchema>;
export type CourseCategoryRecord = InferSelectModel<typeof courseCategories>;
