// src/drizzle/schema/system/activities.ts
import { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: varchar("type", { length: 50 }).notNull(),
  description: text("description"),

  // Actor context
  actorId: varchar("actor_id", { length: 255 }).notNull(),
  actorType: varchar("actor_type", { length: 50 }),
  actorRole: varchar("actor_role", { length: 50 }),

  // Resource context
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: varchar("resource_id", { length: 255 }),

  // Environment context
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  location: varchar("location", { length: 100 }),

  // Status tracking
  status: varchar("status", {
    enum: ["started", "succeeded", "failed", "partial"],
  })
    .notNull()
    .default("started"),

  // Error context (nullable)
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),

  // Metadata
  metadata: jsonb("metadata"),
  isSensitive: boolean("is_sensitive").default(false),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const activitySchema = createInsertSchema(activities, {
  type: z.string().min(1).max(50),
  actorId: z.string().min(1).max(255),
  status: z.enum(["started", "succeeded", "failed", "partial"]),
  metadata: z.record(z.any()).optional(),
});

// Type exports
export type ActivityInput = z.infer<typeof activitySchema>;
export type ActivityRecord = InferSelectModel<typeof activities>;
