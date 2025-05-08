// src/drizzle/schema/petition-system/index.ts
// Enums
export {
  petitionStatusEnum,
  participantRoleEnum,
  petitionCourseActionEnum,
} from "./enums";

// Tables
export { petitionTypes, petitionTypeSchema } from "./petition-types";
export { petitions, petitionSchema } from "./petitions";
export { petitionCourses, petitionCourseSchema } from "./petition-courses";
export {
  petitionParticipants,
  petitionParticipantSchema,
} from "./petition-participants";
export {
  petitionWorkflowSteps,
  petitionWorkflowStepSchema,
} from "./petition-workflow-steps";
export {
  petitionDocuments,
  petitionDocumentSchema,
} from "./petition-documents";
export { petitionMessages, petitionMessageSchema } from "./petition-messages";
export {
  petitionNotifications,
  petitionNotificationSchema,
} from "./petition-notifications";
// Relations
export * from "./relations";
