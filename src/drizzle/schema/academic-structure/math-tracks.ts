import { InferSelectModel } from "drizzle-orm";
import { integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

export const mathTracks = pgTable("math_tracks", {
  id,
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  requiredCoursesCount: integer("required_courses_count").notNull(),
  createdAt,
  updatedAt,
});

export const mathTrackSchema = createInsertSchema(mathTracks).extend({
  name: z.string().min(3).max(50),
  requiredCoursesCount: z.number().int().positive(),
});

export type MathTrackInput = z.infer<typeof mathTrackSchema>;
export type MathTrackRecord = InferSelectModel<typeof mathTracks>;
