import { relations } from "drizzle-orm";

import { studentProfiles } from "@/drizzle/schema/student-records/student-profiles";
import {
  transcriptImports,
  transcriptProcessingSteps,
} from "@/drizzle/schema/transcript-import";

// Define relations for transcript imports
export const transcriptImportsRelations = relations(
  transcriptImports,
  ({ one, many }) => ({
    student: one(studentProfiles, {
      fields: [transcriptImports.studentId],
      references: [studentProfiles.student_id],
    }),
    processingSteps: many(transcriptProcessingSteps),
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
