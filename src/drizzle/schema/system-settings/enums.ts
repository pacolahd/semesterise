// src/drizzle/schema/petition-system/enums.ts
import { pgEnum } from "drizzle-orm/pg-core";

export const userActivityStatusValues = [
  "success",
  "failure",
  "warning",
] as const;

export type UserActivityStatus = (typeof userActivityStatusValues)[number];
export const userActivityStatusEnum = pgEnum(
  "user_activity_status",
  userActivityStatusValues
);

export const errorSeverityValues = [
  "info",
  "warning",
  "error",
  "critical",
] as const;

export type ErrorSeverity = (typeof errorSeverityValues)[number];
export const errorSeverityEnum = pgEnum("error_severity", errorSeverityValues);

export const errorSourceValues = [
  "client",
  "server",
  "database",
  "api",
  "auth",
  "unknown",
] as const;

export type ErrorSource = (typeof errorSourceValues)[number];
export const errorSourceEnum = pgEnum("error_source", errorSourceValues);
