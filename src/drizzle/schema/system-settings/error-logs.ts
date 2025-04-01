// src/drizzle/schema/system-settings/error-logs.ts
import { InferSelectModel } from "drizzle-orm";
import { jsonb, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id } from "@/drizzle/schema/helpers";
import { errorStatusValues } from "@/drizzle/schema/system-settings/enums";

// Remove the circular reference
export const errorLogs = pgTable("error_logs", {
  id,
  // This is a foreign key to activities table, but we don't reference it directly here
  activityId: uuid("activity_id"),

  // Error details
  name: varchar("name", { length: 100 }),
  message: text("message").notNull(),
  stack: text("stack"),
  code: varchar("code", { length: 50 }),
  status: varchar("status", {
    enum: errorStatusValues,
  }).default("unhandled"),

  // Context
  context: jsonb("context"),

  // Timestamp
  createdAt,
});

export const errorLogSchema = createInsertSchema(errorLogs, {
  status: z.enum(errorStatusValues).optional(),
});

// Type exports
export type ErrorLogInput = z.infer<typeof errorLogSchema>;
export type ErrorLogRecord = InferSelectModel<typeof errorLogs>;
