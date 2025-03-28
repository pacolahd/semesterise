// src/drizzle/migrations/0003_create_student_record_views.ts
// eslint-disable-next-line check-file/filename-naming-convention
import { sql } from "drizzle-orm";

import { DB } from "@/drizzle";

export async function up(db: DB) {
  // Create the semester_credit_summaries_view
  await db.execute(sql`
    CREATE OR REPLACE VIEW semester_credit_summaries_view AS
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
      NULL AS cumulative_gpa, -- This would need additional window functions
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
    GROUP BY sc.student_id, sc.semester_id;
  `);

  // Create the category_progress_view
  await db.execute(sql`
    CREATE OR REPLACE VIEW semester_credit_summaries_view AS
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
      NULL AS cumulative_gpa, -- This would need additional window functions
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
    GROUP BY sc.student_id, sc.semester_id;
  `);

  // Create the student_graduation_progress_view
  await db.execute(sql`
    CREATE OR REPLACE VIEW student_graduation_progress_view AS
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
    GROUP BY cp.student_id;
  `);

  // Create helpful indexes to improve view performance
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_student_courses_student_semester ON student_courses(student_id, semester_id);
    CREATE INDEX IF NOT EXISTS idx_student_courses_category ON student_courses(category_name);
    CREATE INDEX IF NOT EXISTS idx_student_courses_status ON student_courses(status);
  `);
}

export async function down(db: DB) {
  await db.execute(sql`
    DROP VIEW IF EXISTS student_graduation_progress_view;
    DROP VIEW IF EXISTS category_progress_view;
    DROP VIEW IF EXISTS semester_credit_summaries_view;
    DROP INDEX IF EXISTS idx_student_courses_student_semester;
    DROP INDEX IF EXISTS idx_student_courses_category;
    DROP INDEX IF EXISTS idx_student_courses_status;
  `);
}
