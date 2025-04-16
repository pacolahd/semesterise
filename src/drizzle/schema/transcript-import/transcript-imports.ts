// src/drizzle/schema/transcript-import/transcript-imports.ts
// Add the fields needed for tracking upsert statistics
import { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, updatedAt } from "@/drizzle/schema/helpers";

import { importStatusEnum, verificationStatusEnum } from "./enums";

export const transcriptImports = pgTable("transcript_imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: text("student_id").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  extractedMajor: text("extracted_major"),
  importStatus: importStatusEnum("import_status").notNull().default("pending"),
  verificationStatus: verificationStatusEnum("verification_status")
    .notNull()
    .default("not_required"),
  requiresVerification: boolean("requires_verification")
    .notNull()
    .default(false),
  semesterCount: integer("semester_count"),
  processedCoursesCount: integer("processed_courses_count"),
  successfullyImportedCount: integer("successfully_imported_count"),
  failedCount: integer("failed_count"),
  importData: jsonb("import_data"),

  // Added fields for tracking upsert statistics
  newSemestersCount: integer("new_semesters_count").default(0),
  updatedSemestersCount: integer("updated_semesters_count").default(0),
  newCoursesCount: integer("new_courses_count").default(0),
  updatedCoursesCount: integer("updated_courses_count").default(0),
  isUpdate: boolean("is_update").default(false),

  createdAt,
  updatedAt,
});

export const transcriptImportSchema = createInsertSchema(transcriptImports);
// Export types following the convention
export type TranscriptImportInput = z.infer<typeof transcriptImportSchema>;
export type TranscriptImportRecord = InferSelectModel<typeof transcriptImports>;
