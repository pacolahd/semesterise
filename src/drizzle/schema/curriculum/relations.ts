import { relations } from "drizzle-orm";

import { departments } from "@/drizzle/schema";
import { majors } from "@/drizzle/schema/institution/majors";

import { courseCategories } from "./course-categories";
import { courseCategorization } from "./course-categorization";
import { courseGradeRequirements } from "./course-grade-requirements";
import { courseOfferings } from "./course-offerings";
import { courses } from "./courses";
import { degreeRequirements } from "./degree-requirements";
import { prerequisiteCourses } from "./prerequisite-courses";
import { prerequisiteGroups } from "./prerequisite-groups";

export const coursesRelations = relations(courses, ({ many, one }) => ({
  department: one(departments, {
    fields: [courses.departmentId],
    references: [departments.id],
  }),
  prerequisiteGroups: many(prerequisiteGroups, {
    relationName: "course_prerequisite_groups",
  }),
  offerings: many(courseOfferings),
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

export const courseOfferingsRelations = relations(
  courseOfferings,
  ({ one }) => ({
    course: one(courses, {
      fields: [courseOfferings.courseId],
      references: [courses.id],
    }),
  })
);

export const courseCategoriesRelations = relations(
  courseCategories,
  ({ one, many }) => ({
    parent: one(courseCategories, {
      fields: [courseCategories.parentCategoryId],
      references: [courseCategories.id],
      relationName: "subcategories",
    }),
    subcategories: many(courseCategories, { relationName: "subcategories" }),
    categorizations: many(courseCategorization),
    degreeRequirements: many(degreeRequirements),
  })
);

export const courseCategorizationRelations = relations(
  courseCategorization,
  ({ one }) => ({
    course: one(courses, {
      fields: [courseCategorization.courseId],
      references: [courses.id],
    }),
    category: one(courseCategories, {
      fields: [courseCategorization.categoryId],
      references: [courseCategories.id],
    }),
    major: one(majors, {
      fields: [courseCategorization.majorId],
      references: [majors.id],
    }),
  })
);

export const courseGradeRequirementsRelations = relations(
  courseGradeRequirements,
  ({ one }) => ({
    major: one(majors, {
      fields: [courseGradeRequirements.majorId],
      references: [majors.id],
    }),
    course: one(courses, {
      fields: [courseGradeRequirements.courseId],
      references: [courses.id],
    }),
  })
);

export const degreeRequirementsRelations = relations(
  degreeRequirements,
  ({ one }) => ({
    major: one(majors, {
      fields: [degreeRequirements.majorId],
      references: [majors.id],
    }),
    category: one(courseCategories, {
      fields: [degreeRequirements.categoryId],
      references: [courseCategories.id],
    }),
  })
);
