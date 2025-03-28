// src/drizzle/schema/institution/staff-profiles.ts
import { InferSelectModel } from "drizzle-orm";
import { boolean, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, updatedAt } from "@/drizzle/schema/helpers";
import { departments } from "@/drizzle/schema/institution/departments";

export const staffProfiles = pgTable("staff_profiles", {
  // Keep the existing school-issued ID as the primary key
  staff_id: varchar("staff_id", { length: 20 }).primaryKey().notNull(),

  // Auth user reference - links to BetterAuth user table
  auth_id: uuid("auth_id").notNull().unique(),
  departmentCode: varchar("department_code").references(
    () => departments.code,
    {
      onDelete: "set null",
    }
  ),
  isActive: boolean("is_active").default(true),
  createdAt,
  updatedAt,
});

export const staffProfileSchema = createInsertSchema(staffProfiles).extend({
  authId: z.string().uuid(),
  staffId: z.string().min(1).max(20),
  departmentCode: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type StaffProfileInput = z.infer<typeof staffProfileSchema>;
export type StaffProfileRecord = InferSelectModel<typeof staffProfiles>;
