// drizzle/schema/departments.ts
import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
