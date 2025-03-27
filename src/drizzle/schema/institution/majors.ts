import { InferSelectModel } from "drizzle-orm";
import { pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

import { departments } from "./departments";

export const majors = pgTable("majors", {
  id,
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id, { onDelete: "restrict" }),
  code: varchar("code", { length: 10 }).notNull().unique(),
  degree: varchar("degree", { length: 100 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt,
  updatedAt,
});

export const majorSchema = createInsertSchema(majors).extend({
  code: z.string().min(2).max(10),
  name: z.string().min(3).max(100),
  degree: z.string().min(10).max(100),
  departmentId: z.string().uuid(),
});

export type MajorInput = z.infer<typeof majorSchema>;
export type MajorRecord = InferSelectModel<typeof majors>;
