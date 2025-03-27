import { InferSelectModel } from "drizzle-orm";
import { boolean, decimal, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, updatedAt } from "@/drizzle/schema/helpers";

export const gradeTypes = pgTable("grade_types", {
  grade: varchar("grade", { length: 5 }).notNull().primaryKey(),
  numericValue: decimal("numeric_value", { precision: 3, scale: 2 }).notNull(),
  description: text("description"),
  isPassing: boolean("is_passing").notNull().default(true),
  createdAt,
  updatedAt,
});

export const gradeTypeSchema = createInsertSchema(gradeTypes).extend({
  grade: z.string().min(1).max(5),
  numericValue: z.number().min(0).max(4).step(0.01),
  isPassing: z.boolean().default(true),
});

export type GradeTypeInput = z.infer<typeof gradeTypeSchema>;
export type GradeTypeRecord = InferSelectModel<typeof gradeTypes>;
