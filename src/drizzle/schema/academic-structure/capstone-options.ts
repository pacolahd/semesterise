import { InferSelectModel } from "drizzle-orm";
import { boolean, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

export const capstoneOptions = pgTable("capstone_options", {
  id,
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  // New fields
  firstSemesterCode: varchar("first_semester_code", { length: 20 }),
  secondSemesterCode: varchar("second_semester_code", { length: 20 }),
  requiresExtraElective: boolean("requires_extra_elective").default(false),
  createdAt,
  updatedAt,
});

// Update your schema definitions
export const capstoneOptionSchema = createInsertSchema(capstoneOptions);
export const selectCapstoneOptionSchema = createSelectSchema(capstoneOptions);

export type CapstoneOptionInput = z.infer<typeof capstoneOptionSchema>;
export type CapstoneOptionRecord = z.infer<typeof selectCapstoneOptionSchema>;
