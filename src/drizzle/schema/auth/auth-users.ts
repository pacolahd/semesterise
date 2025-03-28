// src/drizzle/schema/auth/auth-users.ts
import { InferSelectModel } from "drizzle-orm";
import { boolean, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import {
  userRoleValues,
  userRoles,
  userTypeValues,
  userTypes,
} from "@/drizzle/schema/institution/enums";

export const authUsers = pgTable("user", {
  id,
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: varchar("image", { length: 255 }),

  // Additional custom fields
  userType: varchar("user_type", { length: 20 })
    .notNull()
    .default(userTypes.student),
  role: varchar("role", { length: 50 }).notNull().default(userRoles.student),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),

  createdAt,
  updatedAt,
});

export const authUserSchema = createInsertSchema(authUsers).extend({
  // Add validation
  name: z.string().min(1).max(255),
  userType: z.enum(userTypeValues),
  role: z.enum(userRoleValues),
  firstName: z.string().min(1).max(20).optional().nullable(),
  lastName: z.string().min(1).max(20).optional().nullable(),
});

export type AuthUserInput = z.infer<typeof authUserSchema>;
export type AuthUserRecord = InferSelectModel<typeof authUsers>;
