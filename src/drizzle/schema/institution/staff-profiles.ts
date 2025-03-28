// src/drizzle/schema/institution/staff-profiles.ts
import { InferSelectModel } from "drizzle-orm";
import { boolean, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import { departments } from "@/drizzle/schema/institution/departments";
import {
  staffRoleEnum,
  staffRoleValues,
} from "@/drizzle/schema/institution/enums";

export const staffProfiles = pgTable("staff_profiles", {
  id,
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  staffId: varchar("staff_id", { length: 20 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  departmentCode: varchar("department_code").references(
    () => departments.code,
    {
      onDelete: "set null",
    }
  ),
  role: staffRoleEnum("role").notNull(), // academic_advisor, hod, provost, registry, lecturer
  isActive: boolean("is_active").default(true),
  createdAt,
  updatedAt,
});

export const staffProfileSchema = createInsertSchema(staffProfiles).extend({
  userId: z.string().min(1).max(255),
  staffId: z.string().min(1).max(20),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(100),
  departmentCode: z.string().optional().nullable(),
  role: z.enum(staffRoleValues),
  isActive: z.boolean().default(true),
});

export type StaffProfileInput = z.infer<typeof staffProfileSchema>;
export type StaffProfileRecord = InferSelectModel<typeof staffProfiles>;
