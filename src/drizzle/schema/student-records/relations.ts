// src/drizzle/schema/student-records/relations.ts
import { relations } from "drizzle-orm";

import { academicSemesters } from "@/drizzle/schema/academic-structure/academic-semesters";
import { capstoneOptions } from "@/drizzle/schema/academic-structure/capstone-options";
import { gradeTypes } from "@/drizzle/schema/academic-structure/grade-types";
import { mathTracks } from "@/drizzle/schema/academic-structure/math-tracks";
import { authUsers } from "@/drizzle/schema/auth";
import { courseCategories } from "@/drizzle/schema/curriculum/course-categories";
import { courses } from "@/drizzle/schema/curriculum/courses";
import { majors } from "@/drizzle/schema/institution/majors";

import { academicWarnings } from "./academic-warnings";
import { studentCourses } from "./student-courses";
import { studentProfiles } from "./student-profiles";
import { studentSemesterMappings } from "./student-semester-mappings";

export const studentProfilesRelations = relations(
  studentProfiles,
  ({ one, many }) => ({
    user: one(authUsers, {
      fields: [studentProfiles.authId],
      references: [authUsers.id],
    }),

    major: one(majors, {
      fields: [studentProfiles.majorCode],
      references: [majors.code],
    }),
    mathTrack: one(mathTracks, {
      fields: [studentProfiles.mathTrackName],
      references: [mathTracks.name],
    }),
    capstoneOption: one(capstoneOptions, {
      fields: [studentProfiles.capstoneOptionName],
      references: [capstoneOptions.name],
    }),
    semesterMappings: many(studentSemesterMappings),
    courses: many(studentCourses),
    warnings: many(academicWarnings),
  })
);

export const studentSemesterMappingsRelations = relations(
  studentSemesterMappings,
  ({ one }) => ({
    student: one(studentProfiles, {
      fields: [studentSemesterMappings.studentId],
      references: [studentProfiles.studentId],
    }),
    semester: one(academicSemesters, {
      fields: [studentSemesterMappings.academicSemesterId],
      references: [academicSemesters.id],
    }),
  })
);

export const studentCoursesRelations = relations(studentCourses, ({ one }) => ({
  student: one(studentProfiles, {
    fields: [studentCourses.studentId],
    references: [studentProfiles.studentId],
  }),
  course: one(courses, {
    fields: [studentCourses.courseCode],
    references: [courses.code],
  }),
  semester: one(academicSemesters, {
    fields: [studentCourses.semesterId],
    references: [academicSemesters.id],
  }),
  category: one(courseCategories, {
    fields: [studentCourses.categoryName],
    references: [courseCategories.name],
  }),
  originalCategory: one(courseCategories, {
    fields: [studentCourses.originalCategoryName],
    references: [courseCategories.name],
  }),
  grade: one(gradeTypes, {
    fields: [studentCourses.grade],
    references: [gradeTypes.grade],
  }),
}));

export const academicWarningsRelations = relations(
  academicWarnings,
  ({ one }) => ({
    student: one(studentProfiles, {
      fields: [academicWarnings.studentId],
      references: [studentProfiles.studentId],
    }),
    course: one(courses, {
      fields: [academicWarnings.courseCode],
      references: [courses.code],
    }),
    semester: one(academicSemesters, {
      fields: [academicWarnings.semesterId],
      references: [academicSemesters.id],
    }),
    category: one(courseCategories, {
      fields: [academicWarnings.categoryName],
      references: [courseCategories.name],
    }),
  })
);
