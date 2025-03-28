// src/drizzle/schema/student-records/views/semester-credit-summaries-view.ts
import { InferModelFromColumns, sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  pgView,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const semesterCreditSummariesView = pgView(
  "semester_credit_summaries_view",
  {
    studentId: varchar("student_id"),
    semesterId: uuid("semester_id"),
    creditsAttempted: decimal("credits_attempted", { precision: 4, scale: 1 }),
    creditsRegistered: decimal("credits_registered", {
      precision: 4,
      scale: 1,
    }),
    creditsPassed: decimal("credits_passed", { precision: 4, scale: 1 }),
    gradePoints: decimal("grade_points", { precision: 5, scale: 2 }),
    semesterGpa: decimal("semester_gpa", { precision: 3, scale: 2 }),
    cumulativeGpa: decimal("cumulative_gpa", { precision: 3, scale: 2 }),
    plannedCredits: decimal("planned_credits", { precision: 4, scale: 1 }),
    enrolledCredits: decimal("enrolled_credits", { precision: 4, scale: 1 }),
    completedCredits: decimal("completed_credits", { precision: 4, scale: 1 }),
    isOverloaded: boolean("is_overloaded"),
    workloadStatus: varchar("workload_status", { length: 20 }),
    recommendation: text("recommendation"),
  }
).as(
  sql`
    SELECT 
      sc.student_id,
      sc.semester_id,
      COALESCE(SUM(CASE WHEN sc.status IN ('verified', 'enrolled') THEN c.credits ELSE 0 END), 0) AS credits_attempted,
      COALESCE(SUM(CASE WHEN sc.status = 'enrolled' THEN c.credits ELSE 0 END), 0) AS credits_registered,
      COALESCE(SUM(CASE 
        WHEN sc.status = 'verified' AND EXISTS (
          SELECT 1 FROM grade_types g WHERE g.grade = sc.grade AND g.is_passing = true
        ) THEN c.credits ELSE 0 END), 0) AS credits_passed,
      COALESCE(SUM(CASE 
        WHEN sc.status = 'verified' AND sc.counts_for_gpa = true THEN 
          (SELECT gt.numeric_value FROM grade_types gt WHERE gt.grade = sc.grade) * c.credits
        ELSE 0 
      END), 0) AS grade_points,
      CASE 
        WHEN SUM(CASE WHEN sc.status = 'verified' AND sc.counts_for_gpa = true THEN c.credits ELSE 0 END) > 0 
        THEN 
          SUM(CASE 
            WHEN sc.status = 'verified' AND sc.counts_for_gpa = true THEN 
              (SELECT gt.numeric_value FROM grade_types gt WHERE gt.grade = sc.grade) * c.credits
            ELSE 0 
          END) / 
          SUM(CASE WHEN sc.status = 'verified' AND sc.counts_for_gpa = true THEN c.credits ELSE 0 END)
        ELSE NULL
      END AS semester_gpa,
      NULL AS cumulative_gpa,
      COALESCE(SUM(CASE WHEN sc.status = 'planned' THEN c.credits ELSE 0 END), 0) AS planned_credits,
      COALESCE(SUM(CASE WHEN sc.status = 'enrolled' THEN c.credits ELSE 0 END), 0) AS enrolled_credits,
      COALESCE(SUM(CASE WHEN sc.status = 'verified' THEN c.credits ELSE 0 END), 0) AS completed_credits,
      CASE WHEN COALESCE(SUM(CASE WHEN sc.status = 'enrolled' THEN c.credits ELSE 0 END), 0) > 6.0 
        THEN true ELSE false END AS is_overloaded,
      CASE 
        WHEN COALESCE(SUM(CASE WHEN sc.status = 'enrolled' THEN c.credits ELSE 0 END), 0) > 6.0 THEN 'heavy'
        WHEN COALESCE(SUM(CASE WHEN sc.status = 'enrolled' THEN c.credits ELSE 0 END), 0) < 4.0 THEN 'light'
        ELSE 'balanced'
      END AS workload_status,
      CASE 
        WHEN COALESCE(SUM(CASE WHEN sc.status = 'enrolled' THEN c.credits ELSE 0 END), 0) > 6.0 
          THEN 'Consider reducing your course load for better balance'
        WHEN COALESCE(SUM(CASE WHEN sc.status = 'enrolled' THEN c.credits ELSE 0 END), 0) < 3.0 
          THEN 'You might be able to take additional courses'
        ELSE 'Your course load appears balanced'
      END AS recommendation
    FROM student_courses sc
    JOIN courses c ON sc.course_code = c.code
    GROUP BY sc.student_id, sc.semester_id
  `
);

// Correctly typed with InferSelectModel and the view type
export type SemesterCreditSummary = InferModelFromColumns<
  (typeof semesterCreditSummariesView)["_"]["selectedFields"]
>;
