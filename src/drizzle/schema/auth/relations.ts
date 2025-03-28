// src/drizzle/schema/auth/relations.ts
import { relations } from "drizzle-orm";

import { authAccounts } from "./auth-accounts";
import { authSessions } from "./auth-sessions";
import { authUsers } from "./auth-users";

export const authUsersRelations = relations(authUsers, ({ many }) => ({
  sessions: many(authSessions),
  accounts: many(authAccounts),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(authUsers, {
    fields: [authSessions.userId],
    references: [authUsers.id],
  }),
}));

export const authAccountsRelations = relations(authAccounts, ({ one }) => ({
  user: one(authUsers, {
    fields: [authAccounts.userId],
    references: [authUsers.id],
  }),
}));
