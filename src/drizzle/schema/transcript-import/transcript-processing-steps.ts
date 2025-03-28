import { InferSelectModel } from "drizzle-orm";
import { jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { transcriptImports } from "@/drizzle/schema";
import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import {
  processingStepEnum,
  processingStepStatusEnum,
  processingStepStatusValues,
  processingStepValues,
} from "@/drizzle/schema/transcript-import/enums";

export const transcriptProcessingSteps = pgTable(
  "transcript_processing_steps",
  {
    id,
    importId: uuid("import_id")
      .notNull()
      .references(() => transcriptImports.id, { onDelete: "cascade" }),
    stepName: processingStepEnum("step_name").notNull(),
    status: processingStepStatusEnum("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    details: jsonb("details"),
    createdAt,
    updatedAt,
  }
);

// Define a schema for the details JSONB field for better type safety
export const processingDetailsSchema = z
  .object({
    success: z.boolean().optional(),
    error: z.string().optional(),
    warningCount: z.number().int().optional(),
    processingTime: z.number().optional(), // in milliseconds
    metadata: z.record(z.any()).optional(),
  })
  .optional()
  .nullable();

// Create schema with validation
export const transcriptProcessingStepSchema = createInsertSchema(
  transcriptProcessingSteps
).extend({
  importId: z.string().uuid(),
  stepName: z.enum(processingStepValues),
  status: z.enum(processingStepStatusValues),
  startedAt: z.date().optional().nullable(),
  completedAt: z.date().optional().nullable(),
  details: processingDetailsSchema,
});

// Export types following the convention
export type TranscriptProcessingStepInput = z.infer<
  typeof transcriptProcessingStepSchema
>;

export type ProcessingDetailsInput = z.infer<typeof processingDetailsSchema>;

export type TranscriptProcessingStepRecord = InferSelectModel<
  typeof transcriptProcessingSteps
>;
