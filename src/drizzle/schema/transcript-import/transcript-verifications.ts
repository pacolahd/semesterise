// src/drizzle/schema/transcript-import/transcript-verifications.ts
import { InferSelectModel } from "drizzle-orm";
import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { transcriptImports } from "@/drizzle/schema";
import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import {
  verificationStatusEnum,
  verificationStatusValues,
} from "@/drizzle/schema/transcript-import/enums";

export const transcriptVerifications = pgTable("transcript_verifications", {
  id,
  importId: uuid("import_id")
    .notNull()
    .references(() => transcriptImports.id, { onDelete: "cascade" }),
  verificationToken: varchar("verification_token", { length: 100 }).notNull(),
  status: verificationStatusEnum("status").notNull().default("pending"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  originalMappings: jsonb("original_mappings"), // Store original mappings
  updatedMappings: jsonb("updated_mappings"), // Store user-verified mappings
  userNotes: varchar("user_notes", { length: 500 }),
  createdAt,
  updatedAt,
});

// Create schema with validation
export const transcriptVerificationSchema = createInsertSchema(
  transcriptVerifications
).extend({
  importId: z.string().uuid(),
  verificationToken: z.string().min(20).max(100),
  status: z.enum(verificationStatusValues).default("pending"),
  verifiedAt: z.date().optional().nullable(),
  originalMappings: z.any().optional(),
  updatedMappings: z.any().optional(),
  userNotes: z.string().max(500).optional().nullable(),
});

// Export types following the convention
export type TranscriptVerificationInput = z.infer<
  typeof transcriptVerificationSchema
>;
export type TranscriptVerificationRecord = InferSelectModel<
  typeof transcriptVerifications
>;
