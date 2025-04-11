// src/drizzle/schema/transcript-import/enums.ts - Extended version
import { pgEnum } from "drizzle-orm/pg-core";

export const importStatusValues = [
  "pending",
  "processing",
  "extracting",
  "mapping",
  "verifying",
  "importing",
  "success",
  "partial",
  "failed",
  "cancelled",
  "awaiting_verification",
] as const;

export type ImportStatus = (typeof importStatusValues)[number];

export const importStatusEnum = pgEnum("import_status", importStatusValues);

// Define more detailed processing steps
export const processingStepValues = [
  "file_validation",
  "extraction",
  "student_identification",
  "semester_mapping",
  "course_validation",
  "categorization",
  "grade_analysis",
  "requirements_mapping",
  "database_integration",
  "verification",
  "completion",
] as const;

export type ProcessingStep = (typeof processingStepValues)[number];

export const processingStepEnum = pgEnum(
  "processing_step",
  processingStepValues
);

// Enhanced status values
export const processingStepStatusValues = [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "warning",
  "skipped",
  "awaiting_user_input",
] as const;

export type StepStatus = (typeof processingStepStatusValues)[number];

export const processingStepStatusEnum = pgEnum(
  "step_status",
  processingStepStatusValues
);

// New enum for verification status
export const verificationStatusValues = [
  "not_required",
  "pending",
  "approved",
  "rejected",
  "modified",
] as const;

export type VerificationStatus = (typeof verificationStatusValues)[number];

export const verificationStatusEnum = pgEnum(
  "verification_status",
  verificationStatusValues
);
