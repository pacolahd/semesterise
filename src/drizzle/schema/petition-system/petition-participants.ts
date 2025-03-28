// src/drizzle/schema/petition-system/petition-participants.ts
import { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import {
  participantRoleEnum,
  participantRoleValues,
} from "@/drizzle/schema/petition-system/enums";
import { petitions } from "@/drizzle/schema/petition-system/petitions";

export const petitionParticipants = pgTable("petition_participants", {
  id,
  petitionId: uuid("petition_id")
    .notNull()
    .references(() => petitions.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull(), // References BetterAuth user.id
  role: participantRoleEnum("role").notNull(),
  isNotified: boolean("is_notified").default(false),
  addedBy: varchar("added_by", { length: 255 }), // References BetterAuth user.id who invited this participant
  lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
  createdAt,
  updatedAt,
});

export const petitionParticipantSchema = createInsertSchema(
  petitionParticipants
).extend({
  petitionId: z.string().uuid(),
  userId: z.string().min(1).max(255),
  role: z.enum(participantRoleValues),
  isNotified: z.boolean().default(false),
  addedBy: z.string().max(255).optional().nullable(),
  lastViewedAt: z.date().optional().nullable(),
});

export type PetitionParticipantInput = z.infer<
  typeof petitionParticipantSchema
>;
export type PetitionParticipantRecord = InferSelectModel<
  typeof petitionParticipants
>;
