// src/drizzle/schema/student-records/student-capstone-selections.ts
import { sql } from "drizzle-orm";
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { capstoneOptions } from "../academic-structure/capstone-options";
import { createdAt, updatedAt } from "../helpers";
import { studentProfiles } from "./student-profiles";

export const studentCapstoneSelections = pgTable(
  "student_capstone_selections",
  {
    studentId: varchar("student_id", { length: 20 })
      .primaryKey()
      .references(() => studentProfiles.studentId, { onDelete: "cascade" }),
    capstoneOptionId: uuid("capstone_option_id")
      .notNull()
      .references(() => capstoneOptions.id),
    createdAt,
    updatedAt,
  }
);

// Schema for inserting
export const studentCapstoneSelectionSchema = createInsertSchema(
  studentCapstoneSelections
);

// Schema for selecting
export const selectStudentCapstoneSelectionSchema = createSelectSchema(
  studentCapstoneSelections
);

// Types
export type StudentCapstoneSelectionRecord = z.infer<
  typeof selectStudentCapstoneSelectionSchema
>;
export type StudentCapstoneSelectionInput = z.infer<
  typeof studentCapstoneSelectionSchema
>;
