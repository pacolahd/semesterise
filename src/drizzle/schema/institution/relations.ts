import { relations } from "drizzle-orm";

import { authUsers } from "@/drizzle/schema/auth";
import { staffEmailRoles } from "@/drizzle/schema/institution";
import { departmentHeads } from "@/drizzle/schema/institution/department-heads";
import { staffProfiles } from "@/drizzle/schema/institution/staff-profiles";
import { studentProfiles } from "@/drizzle/schema/student-records";

import { departments } from "./departments";
import { majors } from "./majors";

export const departmentsRelations = relations(departments, ({ many }) => ({
  majors: many(majors),
}));

export const majorsRelations = relations(majors, ({ one }) => ({
  department: one(departments, {
    fields: [majors.departmentCode],
    references: [departments.code],
  }),
}));

export const staffProfilesRelations = relations(
  staffProfiles,
  ({ one, many }) => ({
    user: one(authUsers, {
      fields: [staffProfiles.authId],
      references: [authUsers.id],
    }),

    department: one(departments, {
      fields: [staffProfiles.departmentCode],
      references: [departments.code],
    }),
    departmentHeadships: many(departmentHeads),
  })
);

export const staffEmailRoleRelations = relations(
  staffEmailRoles,
  ({ one }) => ({
    department: one(departments, {
      fields: [staffEmailRoles.departmentCode],
      references: [departments.code],
    }),
  })
);

export const departmentHeadsRelations = relations(
  departmentHeads,
  ({ one }) => ({
    department: one(departments, {
      fields: [departmentHeads.departmentCode],
      references: [departments.code],
    }),
    staff: one(staffProfiles, {
      fields: [departmentHeads.staffId],
      references: [staffProfiles.staffId],
    }),
  })
);
