// src/drizzle/schema/system-settings/system-configurations.ts
import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { updatedAt } from "@/drizzle/schema/helpers";

export const systemConfigurations = pgTable("system_configurations", {
  key: varchar("key", { length: 50 }).primaryKey(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedAt,
});

// Schema for inserting
export const systemConfigurationSchema =
  createInsertSchema(systemConfigurations);

// Schema for selecting
export const selectSystemConfigurationSchema =
  createSelectSchema(systemConfigurations);

// Types
export type SystemConfigurationInput = z.infer<
  typeof systemConfigurationSchema
>;
export type SystemConfigurationRecord = z.infer<
  typeof selectSystemConfigurationSchema
>;
