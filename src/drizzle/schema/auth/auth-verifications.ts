// src/drizzle/schema/auth/auth-verifications.ts
import { InferSelectModel } from "drizzle-orm";
import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

export const authVerifications = pgTable("verification", {
  id,
  identifier: varchar("identifier").notNull(),
  value: varchar("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt,
  updatedAt,
});

export const authVerificationSchema = createInsertSchema(authVerifications);

export type AuthVerificationInput = z.infer<typeof authVerificationSchema>;
export type AuthVerificationRecord = InferSelectModel<typeof authVerifications>;
