import { InferSelectModel } from "drizzle-orm";
import {
  integer,
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
} from "@/drizzle/schema/transcript-import/enums";

export const transcriptImports = pgTable("transcript_imports", {
  id,
  studentId: varchar("student_id")
    .notNull()
    .references(() => studentProfiles.studentId, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 255 }).notNull(),
  importDate: timestamp("import_date", { withTimezone: true })
    .notNull()
    .defaultNow(),
  importStatus: importStatusEnum("import_status").notNull(),
  processedCoursesCount: integer("processed_courses_count").default(0),
  notes: text("notes"),
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
  importStatus: z.enum(importStatusValues),
  processedCoursesCount: z.number().int().min(0).optional(),
  notes: z.string().optional().nullable(),
});

// Export types following the convention
export type TranscriptImportInput = z.infer<typeof transcriptImportSchema>;
export type TranscriptImportRecord = InferSelectModel<typeof transcriptImports>;
