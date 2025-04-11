import { relations } from "drizzle-orm";

import { studentProfiles } from "@/drizzle/schema/student-records/student-profiles";
import {
  transcriptImports,
  transcriptProcessingSteps,
  transcriptVerifications,
} from "@/drizzle/schema/transcript-import";

// Define relations for transcript imports
export const transcriptImportsRelations = relations(
  transcriptImports,
  ({ one, many }) => ({
    student: one(studentProfiles, {
      fields: [transcriptImports.studentId],
      references: [studentProfiles.studentId],
    }),
    processingSteps: many(transcriptProcessingSteps),
    verifications: many(transcriptVerifications), // Add this relation
  })
);

// Define relations for transcript processing steps
export const transcriptProcessingStepsRelations = relations(
  transcriptProcessingSteps,
  ({ one }) => ({
    import: one(transcriptImports, {
      fields: [transcriptProcessingSteps.importId],
      references: [transcriptImports.id],
    }),
  })
);

// Add verification relations
export const transcriptVerificationsRelations = relations(
  transcriptVerifications,
  ({ one }) => ({
    import: one(transcriptImports, {
      fields: [transcriptVerifications.importId],
      references: [transcriptImports.id],
    }),
  })
);
