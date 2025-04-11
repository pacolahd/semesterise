// src/drizzle/schema/transcript-import/transcript-imports.ts
import { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import { studentProfiles } from "@/drizzle/schema/student-records/student-profiles";
import {
  importStatusEnum,
  importStatusValues,
  verificationStatusEnum,
  verificationStatusValues,
} from "@/drizzle/schema/transcript-import/enums";

export const transcriptImports = pgTable("transcript_imports", {
  id,
  studentId: varchar("student_id")
    .notNull()
    .references(() => studentProfiles.studentId, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }), // HTML, MHTML, etc.
  fileSize: integer("file_size"), // Size in bytes
  importDate: timestamp("import_date", { withTimezone: true })
    .notNull()
    .defaultNow(),
  importStatus: importStatusEnum("import_status").notNull(),
  verificationStatus: verificationStatusEnum("verification_status")
    .notNull()
    .default("not_required"),
  processedCoursesCount: integer("processed_courses_count").default(0),
  successfullyImportedCount: integer("successfully_imported_count").default(0),
  semesterCount: integer("semester_count").default(0),
  extractedMajor: varchar("extracted_major", { length: 100 }),
  extractedMathTrack: varchar("extracted_math_track", { length: 50 }),
  requiresVerification: boolean("requires_verification").default(false),
  importData: jsonb("import_data"), // Store the original request data
  notes: text("notes"),
  error: text("error"),
  createdAt,
  updatedAt,
});

// Create schema with validation
export const transcriptImportSchema = createInsertSchema(
  transcriptImports
).extend({
  studentId: z.string(),
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().url().max(255),
  fileType: z.string().max(50).optional(),
  fileSize: z.number().int().min(0).optional(),
  importStatus: z.enum(importStatusValues),
  verificationStatus: z.enum(verificationStatusValues).default("not_required"),
  processedCoursesCount: z.number().int().min(0).optional().default(0),
  successfullyImportedCount: z.number().int().min(0).optional().default(0),
  semesterCount: z.number().int().min(0).optional().default(0),
  extractedMajor: z.string().max(100).optional(),
  extractedMathTrack: z.string().max(50).optional(),
  requiresVerification: z.boolean().default(false),
  importData: z.any().optional(),
  notes: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
});

// Export types following the convention
export type TranscriptImportInput = z.infer<typeof transcriptImportSchema>;
export type TranscriptImportRecord = InferSelectModel<typeof transcriptImports>;
