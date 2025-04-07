// src/drizzle/schema/petition-system/petition-common.ts
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

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

export const petitionTypes = pgTable("petition_types", {
  id,
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  requiresParentSignature: boolean("requires_parent_signature").default(true),
  requiresLecturerSignature: boolean("requires_lecturer_signature").default(
    false
  ),
  requiresAcademicPlan: boolean("requires_academic_plan").default(true),
  customFields: jsonb("custom_fields"), // For type-specific form fields
  createdAt,
  updatedAt,
});

// Define a schema for the custom fields JSONB for better type safety
export const customFieldsSchema = z
  .array(
    z.object({
      name: z.string(),
      label: z.string(),
      type: z.enum([
        "text",
        "textarea",
        "select",
        "checkbox",
        "radio",
        "number",
        "date",
      ]),
      required: z.boolean().default(false),
      options: z
        .array(z.object({ label: z.string(), value: z.string() }))
        .optional(),
      placeholder: z.string().optional(),
      helpText: z.string().optional(),
    })
  )
  .optional()
  .nullable();

export const petitionTypeSchema = createInsertSchema(petitionTypes).extend({
  code: z.string().min(2).max(20),
  name: z.string().min(3).max(100),
  description: z.string().optional().nullable(),
  requiresParentSignature: z.boolean().default(true),
  requiresLecturerSignature: z.boolean().default(false),
  requiresAcademicPlan: z.boolean().default(true),
  customFields: customFieldsSchema,
});

export type PetitionTypeInput = z.infer<typeof petitionTypeSchema>;
export type PetitionTypeRecord = InferSelectModel<typeof petitionTypes>;
