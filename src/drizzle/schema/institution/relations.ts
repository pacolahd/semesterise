import { relations } from "drizzle-orm";

import { departments } from "./departments";
import { majors } from "./majors";

export const departmentsRelations = relations(departments, ({ many }) => ({
  majors: many(majors),
}));

export const majorsRelations = relations(majors, ({ one }) => ({
  department: one(departments, {
    fields: [majors.departmentId],
    references: [departments.id],
  }),
}));
