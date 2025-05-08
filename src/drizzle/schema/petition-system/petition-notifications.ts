// src/drizzle/schema/petition-system/petition-notifications.ts
import { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id } from "@/drizzle/schema/helpers";
import { petitions } from "@/drizzle/schema/petition-system/petitions";

export const petitionNotifications = pgTable("petition_notifications", {
  id,
  recipientUserId: varchar("recipient_user_id", { length: 255 }).notNull(), // References BetterAuth user.id
  petitionId: uuid("petition_id")
    .notNull()
    .references(() => petitions.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'status_change', 'comment', 'invitation', etc.
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt,
});

export const petitionNotificationSchema = createInsertSchema(
  petitionNotifications
).extend({
  recipientUserId: z.string().min(1).max(255),
  petitionId: z.string().uuid(),
  type: z.string().min(1).max(50),
  message: z.string().min(1),
  isRead: z.boolean().default(false),
});

export type PetitionNotificationInput = z.infer<
  typeof petitionNotificationSchema
>;
export type PetitionNotificationRecord = InferSelectModel<
  typeof petitionNotifications
>;
