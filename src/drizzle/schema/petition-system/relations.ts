// src/drizzle/schema/petition-system/relations.ts
import { relations } from "drizzle-orm";

import { academicSemesters } from "@/drizzle/schema/academic-structure/academic-semesters";
import { courses } from "@/drizzle/schema/curriculum/courses";
import { departments } from "@/drizzle/schema/institution/departments";
import { studentProfiles } from "@/drizzle/schema/student-records/student-profiles";

import { petitionCourses } from "./petition-courses";
import { petitionDocuments } from "./petition-documents";
import { petitionMessages } from "./petition-messages";
import { petitionParticipants } from "./petition-participants";
import { petitionTypes } from "./petition-types";
import { petitionWorkflowSteps } from "./petition-workflow-steps";
import { petitions } from "./petitions";

// Petition Types Relations
export const petitionTypesRelations = relations(petitionTypes, ({ many }) => ({
  petitions: many(petitions),
}));

// Petitions Relations
export const petitionsRelations = relations(petitions, ({ one, many }) => ({
  student: one(studentProfiles, {
    fields: [petitions.studentId],
    references: [studentProfiles.student_id],
  }),
  petitionType: one(petitionTypes, {
    fields: [petitions.petitionTypeId],
    references: [petitionTypes.id],
  }),
  semester: one(academicSemesters, {
    fields: [petitions.semesterId],
    references: [academicSemesters.id],
  }),
  primaryDepartment: one(departments, {
    fields: [petitions.primaryDepartmentCode],
    references: [departments.code],
  }),
  secondaryDepartment: one(departments, {
    fields: [petitions.secondaryDepartmentCode],
    references: [departments.code],
  }),
  courses: many(petitionCourses),
  participants: many(petitionParticipants),
  workflowSteps: many(petitionWorkflowSteps),
  documents: many(petitionDocuments),
  messages: many(petitionMessages),
}));

// Petition Courses Relations
export const petitionCoursesRelations = relations(
  petitionCourses,
  ({ one }) => ({
    petition: one(petitions, {
      fields: [petitionCourses.petitionId],
      references: [petitions.id],
    }),
    course: one(courses, {
      fields: [petitionCourses.courseCode],
      references: [courses.code],
    }),
    targetSemester: one(academicSemesters, {
      fields: [petitionCourses.targetSemesterId],
      references: [academicSemesters.id],
    }),
  })
);

// Petition Participants Relations
export const petitionParticipantsRelations = relations(
  petitionParticipants,
  ({ one }) => ({
    petition: one(petitions, {
      fields: [petitionParticipants.petitionId],
      references: [petitions.id],
    }),
  })
);

// Petition Workflow Steps Relations
export const petitionWorkflowStepsRelations = relations(
  petitionWorkflowSteps,
  ({ one }) => ({
    petition: one(petitions, {
      fields: [petitionWorkflowSteps.petitionId],
      references: [petitions.id],
    }),
  })
);

// Petition Documents Relations
export const petitionDocumentsRelations = relations(
  petitionDocuments,
  ({ one }) => ({
    petition: one(petitions, {
      fields: [petitionDocuments.petitionId],
      references: [petitions.id],
    }),
  })
);

// Petition Messages Relations
export const petitionMessagesRelations = relations(
  petitionMessages,
  ({ one }) => ({
    petition: one(petitions, {
      fields: [petitionMessages.petitionId],
      references: [petitions.id],
    }),
  })
);
