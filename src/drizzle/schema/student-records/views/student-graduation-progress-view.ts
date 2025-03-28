// src/drizzle/schema/student-records/views/student-graduation-progress-view.ts
import { InferModelFromColumns, sql } from "drizzle-orm";
import {
  boolean,
  date,
  decimal,
  integer,
  pgView,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const studentGraduationProgressView = pgView(
  "student_graduation_progress_view",
  {
    studentId: varchar("student_id"),
    lastAuditDate: timestamp("last_audit_date", { withTimezone: true }),
    overallProgressPercentage: decimal("overall_progress_percentage", {
      precision: 5,
      scale: 2,
    }),
    creditsCompleted: decimal("credits_completed", { precision: 5, scale: 1 }),
    creditsRemaining: decimal("credits_remaining", { precision: 5, scale: 1 }),
    requirementsCompleted: integer("requirements_completed"),
    requirementsRemaining: integer("requirements_remaining"),
    onTrackForGraduation: boolean("on_track_for_graduation"),
    projectedGraduationDate: date("projected_graduation_date"),
  }
).as(
  sql`
    SELECT
      cp.student_id,
      CURRENT_TIMESTAMP AS last_audit_date,
      
      -- Overall progress percentage
      CASE 
        WHEN SUM(cp.credits_required) > 0 
        THEN (SUM(cp.credits_completed) / SUM(cp.credits_required)) * 100
        ELSE 0
      END AS overall_progress_percentage,
      
      -- Credit totals
      SUM(cp.credits_completed) AS credits_completed,
      GREATEST(SUM(cp.credits_required) - SUM(cp.credits_completed), 0) AS credits_remaining,
      
      -- Requirement counts
      COUNT(CASE WHEN cp.progress_percentage >= 100 THEN 1 ELSE NULL END) AS requirements_completed,
      COUNT(CASE WHEN cp.progress_percentage < 100 THEN 1 ELSE NULL END) AS requirements_remaining,
      
      -- On track flag
      CASE 
        WHEN COUNT(CASE WHEN cp.progress_percentage < 100 THEN 1 ELSE NULL END) = 0 THEN true
        WHEN (SUM(cp.credits_completed) / NULLIF(SUM(cp.credits_required), 0)) >= 0.8 THEN true
        ELSE false
      END AS on_track_for_graduation,
      
      -- Graduate date estimation (simplified)
      (
        SELECT sp.expected_graduation_date 
        FROM student_profiles sp 
        WHERE sp.student_id = cp.student_id
      ) AS projected_graduation_date
    FROM category_progress_view cp
    GROUP BY cp.student_id
  `
);

export type StudentGraduationProgress = InferModelFromColumns<
  (typeof studentGraduationProgressView)["_"]["selectedFields"]
>;
