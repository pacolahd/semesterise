import { InferSelectModel } from "drizzle-orm";
import { date, integer, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

import { academicYears } from "./academic-years";

export const academicSemesters = pgTable("academic_semesters", {
  id,
  academicYearId: uuid("academic_year_id")
    .notNull()
    .references(() => academicYears.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull().unique(),
  sequenceNumber: integer("sequence_number").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt,
  updatedAt,
});

export const academicSemesterSchema = createInsertSchema(academicSemesters)
  .extend({
    name: z.string().min(3).max(50),
    academicYearId: z.string().uuid(),
    sequenceNumber: z.number().int().positive(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export type AcademicSemesterInput = z.infer<typeof academicSemesterSchema>;
export type AcademicSemesterRecord = InferSelectModel<typeof academicSemesters>;
