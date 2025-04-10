import { relations } from "drizzle-orm";

import { mathTracks } from "@/drizzle/schema/academic-structure";
import { departments } from "@/drizzle/schema/institution";
import { majors } from "@/drizzle/schema/institution/majors";

import { courseCategories } from "./course-categories";
import { courseCategorization } from "./course-categorization";
import { courseGradeRequirements } from "./course-grade-requirements";
import { courses } from "./courses";
import { degreeRequirements } from "./degree-requirements";
import { prerequisiteCourses } from "./prerequisite-courses";
import { prerequisiteGroups } from "./prerequisite-groups";

export const coursesRelations = relations(courses, ({ many, one }) => ({
  department: one(departments, {
    fields: [courses.departmentCode],
    references: [departments.code],
  }),
  prerequisiteGroups: many(prerequisiteGroups, {
    relationName: "course_prerequisite_groups",
  }),
  categorizations: many(courseCategorization),

  gradeRequirements: many(courseGradeRequirements),
}));

export const prerequisiteGroupsRelations = relations(
  prerequisiteGroups,
  ({ many, one }) => ({
    course: one(courses, {
      fields: [prerequisiteGroups.courseCode],
      references: [courses.code],
      relationName: "course_prerequisite_groups",
    }),
    prerequisiteCourses: many(prerequisiteCourses),
  })
);

export const prerequisiteCoursesRelations = relations(
  prerequisiteCourses,
  ({ one }) => ({
    group: one(prerequisiteGroups, {
      fields: [prerequisiteCourses.groupKey],
      references: [prerequisiteGroups.groupKey],
    }),
    prerequisiteCourse: one(courses, {
      fields: [prerequisiteCourses.prerequisiteCourseCode],
      references: [courses.code],
    }),
  })
);

export const courseCategoriesRelations = relations(
  courseCategories,
  ({ one, many }) => ({
    parent: one(courseCategories, {
      fields: [courseCategories.parentCategoryName],
      references: [courseCategories.name],
      relationName: "subcategories",
    }),
    subcategories: many(courseCategories, { relationName: "subcategories" }),
    categorizations: many(courseCategorization),
    degreeRequirements: many(degreeRequirements),
  })
);

// Course Categorization Relations
export const courseCategorizationRelations = relations(
  courseCategorization,
  ({ one }) => ({
    course: one(courses, {
      fields: [courseCategorization.courseCode],
      references: [courses.code],
    }),
    category: one(courseCategories, {
      fields: [courseCategorization.categoryName],
      references: [courseCategories.name],
    }),
    mathTrack: one(mathTracks, {
      fields: [courseCategorization.mathTrackName],
      references: [mathTracks.name],
    }),
  })
);

export const courseGradeRequirementsRelations = relations(
  courseGradeRequirements,
  ({ one }) => ({
    major: one(majors, {
      fields: [courseGradeRequirements.majorCode],
      references: [majors.code],
    }),
    course: one(courses, {
      fields: [courseGradeRequirements.courseCode],
      references: [courses.code],
    }),
  })
);

export const degreeRequirementsRelations = relations(
  degreeRequirements,
  ({ one }) => ({
    major: one(majors, {
      fields: [degreeRequirements.majorCode],
      references: [majors.code],
    }),
    category: one(courseCategories, {
      fields: [degreeRequirements.categoryName],
      references: [courseCategories.name],
    }),
  })
);
