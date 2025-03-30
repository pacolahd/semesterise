// src/drizzle/schema/auth/auth-accounts.ts
import { InferSelectModel } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

import { authUsers } from "./auth-users";

export const authAccounts = pgTable("account", {
  id,
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  accountId: varchar("account_id").notNull(),
  providerId: varchar("provider_id").notNull(),
  accessToken: varchar("access_token"),
  refreshToken: varchar("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: varchar("scope"),
  password: text("password"),
  createdAt,
  updatedAt,
});

export const authAccountSchema = createInsertSchema(authAccounts).extend({
  userId: z.string().min(1),
  accountId: z.string().min(1),
  providerId: z.string().min(1),
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
  accessTokenExpiresAt: z.date().optional().nullable(),
  refreshTokenExpiresAt: z.date().optional().nullable(),
  scope: z.string().optional().nullable(),
  idToken: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
});

export type AuthAccountInput = z.infer<typeof authAccountSchema>;
export type AuthAccountRecord = InferSelectModel<typeof authAccounts>;
