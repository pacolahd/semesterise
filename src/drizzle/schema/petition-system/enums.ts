// src/drizzle/schema/petition-system/enums.ts
import { pgEnum } from "drizzle-orm/pg-core";

export const petitionStatusValues = [
  "draft",
  "submitted",
  "advisor_approved",
  "advisor_rejected",
  "hod_approved",
  "hod_rejected",
  "provost_approved",
  "provost_rejected",
  "registry_processing",
  "completed",
  "cancelled",
] as const;

export type PetitionStatus = (typeof petitionStatusValues)[number];
export const petitionStatusEnum = pgEnum(
  "petition_status",
  petitionStatusValues
);

export const participantRoleValues = [
  "student",
  "academic_advisor",
  "hod",
  "provost",
  "registry",
  "invited_approver",
  "observer",
] as const;

export type ParticipantRole = (typeof participantRoleValues)[number];
export const participantRoleEnum = pgEnum(
  "participant_role",
  participantRoleValues
);

export const petitionCourseActionValues = [
  "add",
  "drop",
  "retake",
  "audit",
  "waive_prerequisite",
  "substitute",
] as const;

export type PetitionCourseAction = (typeof petitionCourseActionValues)[number];
export const petitionCourseActionEnum = pgEnum(
  "petition_course_action",
  petitionCourseActionValues
);
