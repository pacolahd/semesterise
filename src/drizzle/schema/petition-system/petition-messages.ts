// src/drizzle/schema/petition-system/petition-messages.ts
import { InferSelectModel } from "drizzle-orm";
import { boolean, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { authUsers } from "@/drizzle/schema";
import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import { petitions } from "@/drizzle/schema/petition-system/petitions";

export const petitionMessages = pgTable("petition_messages", {
  id,
  petitionId: uuid("petition_id")
    .notNull()
    .references(() => petitions.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),

  message: text("message").notNull(),
  isAdminOnly: boolean("is_admin_only").default(false),
  createdAt,
  updatedAt,
});

export const petitionMessageSchema = createInsertSchema(
  petitionMessages
).extend({
  petitionId: z.string().uuid(),
  userId: z.string().min(1).max(255),
  message: z.string().min(1),
  isAdminOnly: z.boolean().default(false),
});

export type PetitionMessageInput = z.infer<typeof petitionMessageSchema>;
export type PetitionMessageRecord = InferSelectModel<typeof petitionMessages>;
