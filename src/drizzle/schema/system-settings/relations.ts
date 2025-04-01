// src/drizzle/schema/system-settings/relations.ts
import { relations } from "drizzle-orm";

import { activities } from "./activities";
import { errorLogs } from "./error-logs";

// Activities can have many error logs
export const activitiesRelations = relations(activities, ({ many }) => ({
  errors: many(errorLogs),
}));

// An error log belongs to one activity
export const errorLogsRelations = relations(errorLogs, ({ one }) => ({
  activity: one(activities, {
    fields: [errorLogs.activityId],
    references: [activities.id],
  }),
}));
