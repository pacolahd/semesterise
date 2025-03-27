import { relations } from "drizzle-orm";

import { academicSemesters } from "./academic-semesters";
import { academicYears } from "./academic-years";

export const academicYearsRelations = relations(academicYears, ({ many }) => ({
  semesters: many(academicSemesters),
}));

export const academicSemestersRelations = relations(
  academicSemesters,
  ({ one }) => ({
    academicYear: one(academicYears, {
      fields: [academicSemesters.academicYearId],
      references: [academicYears.id],
    }),
  })
);

// Math tracks, grade types, and capstone options don't have relations
// within this folder, but will relate to tables in student-records later
