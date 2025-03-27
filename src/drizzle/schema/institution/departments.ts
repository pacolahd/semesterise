import { InferSelectModel } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

export const departments = pgTable("departments", {
  id,
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt,
  updatedAt,
});

export const departmentSchema = createInsertSchema(departments).extend({
  code: z.string().min(2).max(10),
  name: z.string().min(1).max(100),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
export type DepartmentRecord = InferSelectModel<typeof departments>;
