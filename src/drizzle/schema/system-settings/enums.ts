// src/drizzle/schema/petition-system/enums.ts
import { pgEnum } from "drizzle-orm/pg-core";

export const activityStatusValues = [
  "started",
  "succeeded",
  "failed",
  "partial",
] as const;

export type UserActivityStatus = (typeof activityStatusValues)[number];
export const activityStatusEnum = pgEnum(
  "user_activity_status",
  activityStatusValues
);

export const errorStatusValues = [
  "unhandled",
  "handled",
  "suppressed",
  "critical",
] as const;

export type ErrorStatus = (typeof errorStatusValues)[number];
export const errorStatusEnum = pgEnum("error_status", errorStatusValues);

export const errorSeverityValues = [
  "info",
  "warning",
  "error",
  "critical",
  "high",
  "low",
  "medium",
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
