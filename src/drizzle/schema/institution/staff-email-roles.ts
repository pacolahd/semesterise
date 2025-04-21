// drizzle/schema/institution/staff-email-roles.ts
import { InferSelectModel } from "drizzle-orm";
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { userRoleValues } from "@/drizzle/schema/auth/enums";
import { createdAt, updatedAt } from "@/drizzle/schema/helpers";
import { departments } from "@/drizzle/schema/institution/departments";

export const staffEmailRoles = pgTable("staff_email_roles", {
  email: varchar("email", { length: 100 }).notNull().primaryKey(),
  role: varchar("role", { length: 50 }).notNull(),
  departmentCode: varchar("department_code").references(
    () => departments.code,
    {
      onDelete: "set null",
    }
  ),
  createdAt,
  updatedAt,
});

export const staffEmailRoleSchema = createInsertSchema(staffEmailRoles).extend({
  email: z.string().email().max(100),
  role: z.enum(userRoleValues),
  departmentCode: z.string().optional().nullable(),
});

export type StaffEmailRoleInput = z.infer<typeof staffEmailRoleSchema>;
export type StaffEmailRoleRecord = InferSelectModel<typeof staffEmailRoles>;
