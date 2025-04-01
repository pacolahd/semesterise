// src/drizzle/schema/system/error-logs.ts
import { InferSelectModel } from "drizzle-orm";
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { activities } from "@/drizzle/schema";
import { activitySchema } from "@/drizzle/schema/system-settings/activities";

export const errorLogs = pgTable("error_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  activityId: uuid("activity_id").references(() => activities.id),
  errorId: varchar("error_id", { length: 100 }).notNull(),

  // Error details
  name: varchar("name", { length: 100 }),
  message: text("message").notNull(),
  stack: text("stack"),
  code: varchar("code", { length: 50 }),
  status: varchar("status", {
    enum: ["unhandled", "handled", "suppressed", "critical"],
  }).default("unhandled"),

  // Context
  context: jsonb("context"),

  // Timestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const errorLogSchema = createInsertSchema(errorLogs, {
  status: z.enum(["unhandled", "handled", "suppressed", "critical"]).optional(),
});

// Type exports
export type ErrorLogInput = z.infer<typeof errorLogSchema>;
export type ErrorLogRecord = InferSelectModel<typeof errorLogs>;
