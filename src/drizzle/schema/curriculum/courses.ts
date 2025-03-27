import { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { courseStatusValues } from "@/drizzle/schema/curriculum/enums";
import {
  courseStatusEnum,
  createdAt,
  id,
  updatedAt,
} from "@/drizzle/schema/helpers";
import { departments } from "@/drizzle/schema/institution/departments";

export const courses = pgTable("courses", {
  id,
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id, { onDelete: "restrict" }),
  code: varchar("code", { length: 20 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull().unique(),
  description: text("description"),
  credits: decimal("credits", { precision: 3, scale: 1 }).notNull(),
  level: integer("level").notNull(), // 100, 200, 300, or 400 level
  prerequisiteText: text("prerequisite_text"), // Original text from catalog
  status: courseStatusEnum("status").notNull().default("active"),
  countsForGpa: boolean("counts_for_gpa").notNull().default(true),
  createdAt,
  updatedAt,
});

// Base schema with common validations
const baseSchema = createInsertSchema(courses).extend({
  code: z.string().min(2).max(20),
  title: z.string().min(3).max(255),
  credits: z.number().min(0).max(4),
  level: z.number().int().min(100).max(400).step(100), // Validate that it's a proper course level
  prerequisiteText: z.string().optional(),
});

export const courseSchema = z.union([
  z.object({
    mode: z.literal("create"),
    departmentId: z.string().uuid(),
    code: baseSchema.shape.code,
    title: baseSchema.shape.title,
    description: z.string().optional(),
    credits: baseSchema.shape.credits,
    level: baseSchema.shape.level,
    prerequisiteText: baseSchema.shape.prerequisiteText,
    status: z.enum(courseStatusValues).default("active"),
    countsForGpa: z.boolean().default(true),
  }),
  z.object({
    mode: z.literal("edit"),
    id: z.string().uuid(),
    departmentId: z.string().uuid(),
    code: baseSchema.shape.code,
    title: baseSchema.shape.title,
    description: z.string().optional(),
    credits: baseSchema.shape.credits,
    level: baseSchema.shape.level,
    prerequisiteText: baseSchema.shape.prerequisiteText,
    status: z.enum(courseStatusValues),
    countsForGpa: z.boolean(),
  }),
]);

export type CourseInput = z.infer<typeof courseSchema>;
export type CourseRecord = InferSelectModel<typeof courses>;
