// src/drizzle/schema/auth/auth-sessions.ts
import { InferSelectModel } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

import { authUsers } from "./auth-users";

export const authSessions = pgTable("session", {
  id,
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  token: varchar("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt,
  updatedAt,
});

export const authSessionSchema = createInsertSchema(authSessions).extend({
  userId: z.string().min(1),
  token: z.string().min(1),
  expiresAt: z.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

export type AuthSessionInput = z.infer<typeof authSessionSchema>;
export type AuthSessionRecord = InferSelectModel<typeof authSessions>;
