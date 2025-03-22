// drizzle/schema/majors.ts
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { departments } from "./departments";

export const majors = pgTable("majors", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type Major = typeof majors.$inferSelect;
export type NewMajor = typeof majors.$inferInsert;
