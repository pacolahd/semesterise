// src/drizzle/schema/system-settings/activities.ts
import { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id } from "@/drizzle/schema/helpers";
import { activityStatusValues } from "@/drizzle/schema/system-settings/enums";

// Remove the circular reference
export const activities = pgTable("activities", {
  id,
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
    enum: activityStatusValues,
  })
    .notNull()
    .default("started"),

  // Remove direct reference to errorLogs
  // Since an activity can have multiple errors, we'll handle this in the relations
  /*
    The correct database structure is exactly what we've established:

    activities table: Only has its own primary key id
    errorLogs table: Has its own primary key id AND a foreign key activityId that references the activities table

    The relationship works because:

    To find which activity an error belongs to, you look at the error's activityId
    To find all errors for an activity, you query for all errors where activityId equals the activity's id
*/

  // Metadata
  metadata: jsonb("metadata"),
  isSensitive: boolean("is_sensitive").default(false),

  // Timestamps
  createdAt,
  completedAt: timestamp("completed_at").$onUpdate(() => new Date()),
});

export const activitySchema = createInsertSchema(activities, {
  type: z.string().min(1),
  actorId: z.string().min(1),
  status: z.enum(activityStatusValues),
  metadata: z.record(z.any()).optional(),
});

// Type exports
export type ActivityInput = z.infer<typeof activitySchema>;
export type ActivityRecord = InferSelectModel<typeof activities>;
