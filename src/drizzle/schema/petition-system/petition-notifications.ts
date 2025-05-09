// src/drizzle/schema/petition-system/petition-notifications.ts
import { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  integer,
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
  sequence: integer("sequence_number"), // Unique sequence for each notification
  createdAt,
});

export const petitionNotificationSchema = createInsertSchema(
  petitionNotifications
).extend({
  recipientUserId: z.string().min(1).max(255),
  petitionId: z.string().uuid(),
  type: z.enum([
    "petition_submitted",
    "new_petition",
    "invitation",
    "status_change",
    "new_message",
    "petition_approved",
    "petition_rejected",
    "petition_completed",
  ]),
  message: z.string().min(1),
  isRead: z.boolean().default(false),
  sequence: z.number().int().min(0).optional(),
});

export type PetitionNotificationInput = z.infer<
  typeof petitionNotificationSchema
>;
export type PetitionNotificationRecord = InferSelectModel<
  typeof petitionNotifications
>;
