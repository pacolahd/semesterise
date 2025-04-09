// src/drizzle/schema/auth/auth-users.ts
import { InferSelectModel } from "drizzle-orm";
import { boolean, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import {
  userRoleValues,
  userRoles,
  userTypeValues,
  userTypes,
} from "@/drizzle/schema/auth/enums";
import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

export const authUsers = pgTable("user", {
  id,
  name: varchar("name").notNull(),
  email: varchar("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: varchar("image"),

  // Additional custom fields
  userType: varchar("user_type", { length: 20 })
    .notNull()
    .default(userTypes.student),
  role: varchar("role", { length: 50 }).notNull().default(userRoles.student),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt,
  updatedAt,
});

// export const authUserSchema = createInsertSchema(authUsers).extend({
//   // Add validation
//   name: z.string().min(1).max(50).optional(),
//   // id: z.string().uuid(), // Ensure id is required
//   // email: z.string().email().min(1), // Required
//   // emailVerified: z.boolean().default(false), // Ensure it's required
//   image: z.string().url().optional().nullable(), // Optional image
//   // createdAt: z.date(), // Required
//   // updatedAt: z.date(), // Required
//   // userType: z.enum(userTypeValues),
//   // role: z.enum(userRoleValues),
//   onboardingCompleted: z.boolean().optional(),
// });

export const authUserSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  image: z.string().url().optional().nullable(),
  onboardingCompleted: z.boolean().optional(),
});

export type AuthUserInput = z.infer<typeof authUserSchema>;
export type AuthUserRecord = InferSelectModel<typeof authUsers>;
