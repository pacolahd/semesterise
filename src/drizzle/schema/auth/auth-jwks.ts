// src/drizzle/schema/auth/auth-jwks.ts
import { InferSelectModel } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";

export const authJWKS = pgTable("jwks", {
  id,
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt,
});

export const authJWKSSchema = createInsertSchema(authJWKS);

export type AuthJWTsInput = z.infer<typeof authJWKSSchema>;
export type AuthJWTsRecord = InferSelectModel<typeof authJWKS>;
