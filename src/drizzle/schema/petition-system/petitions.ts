// src/drizzle/schema/petition-system/petitions.ts
import { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { academicSemesters } from "@/drizzle/schema/academic-structure/academic-semesters";
import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import { departments } from "@/drizzle/schema/institution/departments";
import {
  petitionStatusEnum,
  petitionStatusValues,
} from "@/drizzle/schema/petition-system/enums";
import { petitionTypes } from "@/drizzle/schema/petition-system/petition-types";
import { studentProfiles } from "@/drizzle/schema/student-records/student-profiles";

export const petitions = pgTable("petitions", {
  id,
  referenceNumber: varchar("reference_number", { length: 20 })
    .notNull()
    .unique(),
  studentId: varchar("student_id", { length: 20 })
    .notNull()
    .references(() => studentProfiles.student_id, { onDelete: "cascade" }),
  petitionTypeId: uuid("petition_type_id")
    .notNull()
    .references(() => petitionTypes.id, { onDelete: "restrict" }),
  semesterId: uuid("semester_id")
    .notNull()
    .references(() => academicSemesters.id, { onDelete: "restrict" }),
  status: petitionStatusEnum("status").notNull().default("draft"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  academicPlanIncluded: boolean("academic_plan_included").default(false),
  primaryDepartmentCode: varchar("primary_department_id")
    .notNull()
    .references(() => departments.code, { onDelete: "restrict" }),
  secondaryDepartmentCode: varchar("secondary_department_id").references(
    () => departments.code,
    { onDelete: "set null" }
  ),
  signedDocumentUrl: varchar("signed_document_url", { length: 255 }),
  customData: jsonb("custom_data"), // Type-specific student responses
  createdAt,
  updatedAt,
});

export const petitionSchema = createInsertSchema(petitions).extend({
  referenceNumber: z.string().min(4).max(20),
  studentId: z.string().min(1).max(20),
  petitionTypeId: z.string().uuid(),
  semesterId: z.string().uuid(),
  status: z.enum(petitionStatusValues).default("draft"),
  title: z.string().min(5).max(255),
  description: z.string().optional().nullable(),
  academicPlanIncluded: z.boolean().default(false),
  primaryDepartmentCode: z.string(),
  secondaryDepartmentCode: z.string().optional().nullable(),
  signedDocumentUrl: z.string().url().max(255).optional().nullable(),
  customData: z.record(z.any()).optional().nullable(),
});

export type PetitionInput = z.infer<typeof petitionSchema>;
export type PetitionRecord = InferSelectModel<typeof petitions>;
