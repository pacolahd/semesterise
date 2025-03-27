import { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import {
  courseStatusValues,
  semesterOfferingEnum,
  semesterOfferingValues,
} from "@/drizzle/schema/curriculum/enums";
import {
  courseStatusEnum,
  createdAt,
  updatedAt,
} from "@/drizzle/schema/helpers";
import { departments } from "@/drizzle/schema/institution/departments";

export const courses = pgTable("courses", {
  // Department relationship
  departmentCode: varchar("department_code")
    .notNull()
    .references(() => departments.code, { onDelete: "restrict" }),

  // Basic course identifiers
  code: varchar("code", { length: 20 }).notNull().unique().primaryKey(),
  title: varchar("title", { length: 255 }).notNull().unique(),
  description: text("description"),

  // Credit and level information
  credits: decimal("credits", { precision: 3, scale: 1 }).notNull(),
  level: integer("level").notNull(), // 100, 200, 300, or 400 level

  // For transcript import and catalog matching
  prerequisiteText: text("prerequisite_text"), // Original text from catalog

  // Status and GPA information
  status: courseStatusEnum("status").notNull().default("active"),
  countsForGpa: boolean("counts_for_gpa").notNull().default(true),

  // ✅ ARRAY OF ENUMS
  offeredInSemesters: semesterOfferingEnum("offered_in_semesters")
    .array()
    .notNull(),

  createdAt,
  updatedAt,
});

// Base schema with common validations
const baseSchema = createInsertSchema(courses).extend({
  code: z.string().min(2).max(20),
  title: z.string().min(3).max(255),
  credits: z.number().min(0).max(4),
  level: z.number().int().min(100).max(400).step(100), // Validate that it's a proper course level
  prerequisiteText: z.string().optional().nullable(),

  // ✅ Validate `offeredInSemesters` as an array of predefined enums
  offeredInSemesters: z
    .array(z.enum(semesterOfferingValues))
    .nonempty("At least one semester must be specified"), // Ensures at least one value
});

export const courseSchema = z.union([
  z.object({
    mode: z.literal("create"),
    departmentCode: z.string(),
    code: baseSchema.shape.code,
    title: baseSchema.shape.title,
    description: z.string().optional().nullable(),
    credits: baseSchema.shape.credits,
    level: baseSchema.shape.level,
    prerequisiteText: baseSchema.shape.prerequisiteText,
    status: z.enum(courseStatusValues).default("active"),
    countsForGpa: z.boolean().default(true),
    offeredInSemesters: baseSchema.shape.offeredInSemesters,
  }),
  z.object({
    mode: z.literal("edit"),
    id: z.string().uuid(),
    departmentCode: z.string().uuid(),
    code: baseSchema.shape.code,
    title: baseSchema.shape.title,
    description: z.string().optional().nullable(),
    credits: baseSchema.shape.credits,
    level: baseSchema.shape.level,
    prerequisiteText: baseSchema.shape.prerequisiteText,
    status: z.enum(courseStatusValues),
    countsForGpa: z.boolean(),
    offeredInSemesters: baseSchema.shape.offeredInSemesters,
  }),
]);

export type CourseInput = z.infer<typeof courseSchema>;
export type CourseRecord = InferSelectModel<typeof courses>;
