import { InferSelectModel } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

export const capstoneOptions = pgTable("capstone_options", {
  id,
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdAt,
  updatedAt,
});

export const capstoneOptionSchema = createInsertSchema(capstoneOptions).extend({
  name: z.string().min(3).max(100),
});

export type CapstoneOptionInput = z.infer<typeof capstoneOptionSchema>;
export type CapstoneOptionRecord = InferSelectModel<typeof capstoneOptions>;
