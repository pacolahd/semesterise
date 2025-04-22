// src/drizzle/schema/institution/department-heads.ts
import { InferSelectModel } from "drizzle-orm";
import { boolean, date, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import { departments } from "@/drizzle/schema/institution/departments";
import { staffProfiles } from "@/drizzle/schema/institution/staff-profiles";

export const departmentHeads = pgTable("department_heads", {
  id,
  departmentCode: varchar("department_code")
    .notNull()
    .references(() => departments.code, { onDelete: "cascade" }),
  staffId: varchar("staff_id")
    .notNull()
    .references(() => staffProfiles.staffId, { onDelete: "cascade" }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  isCurrent: boolean("is_current").default(true),
  createdAt,
  updatedAt,
});

export const departmentHeadSchema = createInsertSchema(departmentHeads).extend({
  departmentCode: z.string(),
  staffId: z.string(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  isCurrent: z.boolean().default(true),
});
// .refine((data) => !data.endDate || data?.startDate < data.endDate, {
//   message: "End date must be after start date",
//   path: ["endDate"],
// });

export type DepartmentHeadInput = z.infer<typeof departmentHeadSchema>;
export type DepartmentHeadRecord = InferSelectModel<typeof departmentHeads>;
