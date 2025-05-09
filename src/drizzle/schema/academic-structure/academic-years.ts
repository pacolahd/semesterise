import { InferSelectModel } from "drizzle-orm";
import { boolean, date, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, updatedAt } from "@/drizzle/schema/helpers";

export const academicYears = pgTable("academic_years", {
  yearName: varchar("year_name", { length: 20 }).notNull().primaryKey(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt,
  updatedAt,
});

export const academicYearSchema = createInsertSchema(academicYears)
  .extend({
    yearName: z
      .string()
      .min(7)
      .max(20)
      .regex(/^\d{4}-\d{4}$/, "Must be in format YYYY-YYYY"),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be in format YYYY-MM-DD"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be in format YYYY-MM-DD"),
    isCurrent: z.boolean().default(false),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export type AcademicYearInput = z.infer<typeof academicYearSchema>;
export type AcademicYearRecord = InferSelectModel<typeof academicYears>;
