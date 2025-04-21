// src/drizzle/schema/student-records/student-courses.ts
import { InferSelectModel, sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import {
  academicSemesters,
  courseCategories,
  courses,
  gradeTypes,
} from "@/drizzle/schema";
import { createdAt, updatedAt } from "@/drizzle/schema/helpers";
import {
  studentCourseStatusEnum,
  studentCourseStatusValues,
} from "@/drizzle/schema/student-records/enums";
import { studentProfiles } from "@/drizzle/schema/student-records/student-profiles";

export const studentCourses = pgTable(
  "student_courses",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    studentId: varchar("student_id", { length: 20 })
      .notNull()
      .references(() => studentProfiles.studentId, { onDelete: "cascade" }),
    courseCode: varchar("course_code", { length: 20 })
      .notNull()
      .references(() => courses.code, { onDelete: "restrict" }),
    semesterId: uuid("semester_id")
      .notNull()
      .references(() => academicSemesters.id, { onDelete: "restrict" }),
    status: studentCourseStatusEnum("status").notNull(),
    grade: varchar("grade", { length: 5 }).references(() => gradeTypes.grade, {
      onDelete: "set null",
    }), // References grade_types
    categoryName: varchar("category_name").references(
      () => courseCategories.name,
      { onDelete: "set null" }
    ),
    originalCategoryName: varchar("original_category_name").references(
      () => courseCategories.name,
      { onDelete: "set null" }
    ),
    // isVerified: boolean("is_verified").default(false),
    // countsForGpa: boolean("counts_for_gpa").default(true),
    // isUsedForRequirement: boolean("is_used_for_requirement").default(true),
    notes: text("notes"),
    createdAt,
    updatedAt,
  },
  (table) => {
    return {
      studentSemesterIndex: index("idx_student_courses_student_semester")
        .on(table.studentId.asc(), table.semesterId.desc())
        .with({ fillfactor: 90 }),
      categoryIndex: index("idx_student_courses_category")
        .on(table.categoryName)
        .where(sql`${table.categoryName} IS NOT NULL`),
      statusIndex: index("idx_student_courses_status")
        .using("btree", table.status)
        .where(sql`${table.status} <> 'dropped'`),
    };
  }
);

export const studentCourseSchema = createInsertSchema(studentCourses).extend({
  student_id: z.string().min(1).max(20),
  course_code: z.string().min(2).max(20),
  semester_id: z.string().uuid(),
  status: z.enum(studentCourseStatusValues),
  grade: z.string().max(5).optional().nullable(),
  category_name: z.string().optional().nullable(),
  original_category_name: z.string().optional().nullable(),
  // is_verified: z.boolean().default(false),
  // counts_for_gpa: z.boolean().default(true),
  // is_used_for_requirement: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export type StudentCourseInput = z.infer<typeof studentCourseSchema>;
export type StudentCourseRecord = InferSelectModel<typeof studentCourses>;
