// This file contains types that are used throughout the application.
// These are imported from the drizzle schema
import {
  SerializedAppError,
  ValidationErrorDetails,
} from "@/lib/errors/error-types";

export type {
  ErrorSeverity,
  ErrorSource,
  UserActivityStatus,
} from "@/drizzle/schema/system-settings/enums";

export type { UserRole, UserType } from "@/drizzle/schema/auth/enums";
export type {
  CourseStatus,
  SemesterOffering,
} from "@/drizzle/schema/curriculum/enums";
export type {
  ParticipantRole,
  PetitionStatus,
} from "@/drizzle/schema/petition-system/enums";
export type { StudentCourseStatus } from "@/drizzle/schema/student-records/enums";
export type {
  ImportStatus,
  StepStatus,
  ProcessingStep,
} from "@/drizzle/schema/transcript-import/enums";

// These are created here
export type ErrorContext = Record<string, unknown>;

// This defines a generic permission system that can be used alongside BetterAuth's roles
export type Permission =
  | "manage:petitions"
  | "view:petitions"
  | "manage:degree-audit"
  | "manage:course-plans"
  | "view:reports"
  | "manage:users"
  | "view:student-records"
  | "approve:petitions"
  | "reject:petitions"
  | "implement:petitions";

export const rolePermissions: Record<string, Permission[]> = {
  student: [
    "manage:degree-audit",
    "manage:course-plans",
    "view:petitions", // Students can only view their own
  ],
  academic_advisor: [
    "view:student-records",
    "view:petitions",
    "approve:petitions",
    "reject:petitions",
    "view:reports",
  ],
  hod: [
    "view:student-records",
    "view:petitions",
    "approve:petitions",
    "reject:petitions",
    "view:reports",
  ],
  provost: [
    "view:student-records",
    "view:petitions",
    "approve:petitions",
    "reject:petitions",
    "view:reports",
  ],
  registry: [
    "view:student-records",
    "view:petitions",
    "implement:petitions",
    "view:reports",
    "manage:users",
  ],
  admin: [
    "manage:petitions",
    "view:petitions",
    "manage:degree-audit",
    "manage:course-plans",
    "view:reports",
    "manage:users",
    "view:student-records",
    "approve:petitions",
    "reject:petitions",
    "implement:petitions",
  ],
};

// Common activity types constants
export const ActivityTypes = {
  // Auth activities
  LOGIN: "auth:login",
  SIGNUP: "auth:signup",
  EMAIL_VERIFICATION: "auth:email_verify",
  PASSWORD_RESET: "auth:password_reset",
  LOGOUT: "auth:logout",

  // Petition activities
  VIEW_PETITION: "petition:view",
  CREATE_PETITION: "petition:create",
  UPDATE_PETITION: "petition:update",
  SUBMIT_PETITION: "petition:submit",
  APPROVE_PETITION: "petition:approve",
  REJECT_PETITION: "petition:reject",
  IMPLEMENT_PETITION: "petition:implement",
  ADD_COMMENT: "petition:add_comment",
  ADMIN_COMMENT: "petition:admin_comment",

  // Degree audit activities
  IMPORT_TRANSCRIPT: "degree:import_transcript",
  VIEW_AUDIT: "degree:view_audit",
  UPDATE_PLAN: "degree:update_plan",
  EXPORT_PLAN: "degree:export_plan",
};

// Entity types constants
export const EntityTypes = {
  USER: "user",
  PETITION: "petition",
  COURSE: "course",
  TRANSCRIPT: "transcript",
  ACADEMIC_PLAN: "academic_plan",
  DEGREE_AUDIT: "degree_audit",
  STUDENT: "student",
};

/**
 * Type for structured response with serialized errors
 */
export type ActionResponse<dataT = null, errorT = SerializedAppError> = {
  success: boolean;
  data?: dataT;
  status?: number;
  error?: errorT;
  message?: string;
  warnings?: string[];
};

// export type ActionResponse<T = unknown> =
//   | { success: true; data?: T; status?: number }
//   | { success: false; error: SerializedAppError; status?: number };
