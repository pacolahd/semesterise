// src/drizzle/schema/student-records/student-courses.ts
import { InferSelectModel, sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { authUsers } from "@/drizzle/schema/auth/auth-users";
import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import {
  studentCourseStatusEnum,
  studentCourseStatusValues,
} from "@/drizzle/schema/student-records/enums";
import { studentProfiles } from "@/drizzle/schema/student-records/student-profiles";

import { academicSemesters, gradeTypes } from "../academic-structure";
import { courseCategories, courses } from "../curriculum";

export const studentCourses = pgTable(
  "student_courses",
  {
    id,
    // Reference to BetterAuth user
    authId: uuid("auth_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    studentId: varchar("student_id", { length: 20 }).references(
      () => studentProfiles.studentId,
      { onDelete: "cascade" }
    ),
    courseCode: varchar("course_code", { length: 20 }),
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
    notes: text("notes"),
    placeholderTitle: varchar("placeholder_title", { length: 255 }),
    placeholderCredits: decimal("placeholder_credits", {
      precision: 3,
      scale: 1,
    }),
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
  studentId: z.string().min(1).max(20),
  authId: z.string().uuid(),
  courseCode: z.string().min(2).max(20).nullable(),
  semesterId: z.string().uuid(),
  status: z.enum(studentCourseStatusValues),
  grade: z.string().max(5).optional().nullable(),
  categoryName: z.string().optional().nullable(),
  originalCategoryName: z.string().optional().nullable(),

  notes: z.string().optional().nullable(),
});

export type StudentCourseInput = z.infer<typeof studentCourseSchema>;
export type StudentCourseRecord = InferSelectModel<typeof studentCourses>;
