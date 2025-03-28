// src/drizzle/schema/petition-system/petition-documents.ts
import { InferSelectModel } from "drizzle-orm";
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { createdAt, id, updatedAt } from "@/drizzle/schema/helpers";
import { petitions } from "@/drizzle/schema/petition-system/petitions";

export const petitionDocuments = pgTable("petition_documents", {
  id,
  petitionId: uuid("petition_id")
    .notNull()
    .references(() => petitions.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  documentUrl: varchar("document_url", { length: 255 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  uploadedBy: varchar("uploaded_by", { length: 255 }).notNull(), // References BetterAuth user.id
  createdAt,
  updatedAt,
});

export const petitionDocumentSchema = createInsertSchema(
  petitionDocuments
).extend({
  petitionId: z.string().uuid(),
  documentType: z.string().min(1).max(50),
  documentUrl: z.string().url().max(255),
  fileName: z.string().min(1).max(255),
  uploadedBy: z.string().min(1).max(255),
});

export type PetitionDocumentInput = z.infer<typeof petitionDocumentSchema>;
export type PetitionDocumentRecord = InferSelectModel<typeof petitionDocuments>;
