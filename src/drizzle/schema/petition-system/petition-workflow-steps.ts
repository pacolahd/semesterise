// src/drizzle/schema/petition-system/petition-workflow-steps.ts
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

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import {
  participantRoleEnum,
  participantRoleValues,
} from "@/drizzle/schema/petition-system/enums";
import { petitions } from "@/drizzle/schema/petition-system/petitions";

export const petitionWorkflowSteps = pgTable("petition_workflow_steps", {
  id,
  petitionId: uuid("petition_id")
    .notNull()
    .references(() => petitions.id, { onDelete: "cascade" }),
  role: participantRoleEnum("role").notNull(),
  orderIndex: integer("order_index").notNull(), // Sequence of approval
  isMandatory: boolean("is_mandatory").default(true),
  isCurrent: boolean("is_current").default(false),
  status: varchar("status", { length: 20 }), // 'pending', 'approved', 'rejected', 'skipped'
  actionUserId: varchar("action_user_id", { length: 255 }), // Who took action
  actionDate: timestamp("action_date", { withTimezone: true }),
  comments: text("comments"),
  createdAt,
  updatedAt,
});

export const petitionWorkflowStepSchema = createInsertSchema(
  petitionWorkflowSteps
).extend({
  petitionId: z.string().uuid(),
  role: z.enum(participantRoleValues),
  orderIndex: z.number().int().min(0),
  isMandatory: z.boolean().default(true),
  isCurrent: z.boolean().default(false),
  status: z
    .enum(["pending", "approved", "rejected", "skipped"])
    .optional()
    .nullable(),
  actionUserId: z.string().max(255).optional().nullable(),
  actionDate: z.date().optional().nullable(),
  comments: z.string().optional().nullable(),
});

export type PetitionWorkflowStepInput = z.infer<
  typeof petitionWorkflowStepSchema
>;
export type PetitionWorkflowStepRecord = InferSelectModel<
  typeof petitionWorkflowSteps
>;
