// Define possible import status values as an enum
import { pgEnum } from "drizzle-orm/pg-core";

export const importStatusValues = [
  "pending",
  "processing",
  "success",
  "partial",
  "failed",
] as const;

export type ImportStatus = (typeof importStatusValues)[number];

export const importStatusEnum = pgEnum("import_status", importStatusValues);

// Define possible step names as an enum
export const processingStepValues = [
  "extraction",
  "mapping",
  "validation",
  "categorization",
] as const;

export type ProcessingStep = (typeof processingStepValues)[number];

export const processingStepEnum = pgEnum(
  "processing_step",
  processingStepValues
);

// Define possible status values as an enum
export const processingStepStatusValues = [
  "pending",
  "in_progress",
  "completed",
  "failed",
] as const;

export type StepStatus = (typeof processingStepStatusValues)[number];

export const processingStepStatusEnum = pgEnum(
  "step_status",
  processingStepStatusValues
);
