// src/drizzle/scripts/create-student-record-views.ts
import { sql } from "drizzle-orm";

import { db } from "@/drizzle";

export async function createStudentRecordViews() {
  // The full SQL for creating the views
  await db.execute(sql`
    -- Semester Credit Summaries View
    CREATE OR REPLACE VIEW semester_credit_summaries_view AS
    WITH grade_values AS (
      SELECT grade, numeric_value, is_passing
      FROM grade_types
    )
    SELECT 
      sc.student_id AS "studentId",
      sc.semester_id AS "semesterId",
      -- Attempted credits (verified + enrolled)
      COALESCE(SUM(CASE 
        WHEN sc.status IN ('verified', 'enrolled') THEN c.credits 
        ELSE 0 
      END), 0) AS "creditsAttempted",
      
      -- ... [rest of the view SQL as defined above]

    -- Category Progress View
    CREATE OR REPLACE VIEW category_progress_view AS
    WITH student_major_requirements AS (
      -- ... [rest of the view SQL as defined above]
    )

    -- Student Graduation Progress View
    CREATE OR REPLACE VIEW student_graduation_progress_view AS
    SELECT
      -- ... [rest of the view SQL as defined above]
  `);

  console.log("Student record views created successfully");
}

// Run this directly or call from your migration script
if (require.main === module) {
  createStudentRecordViews()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed to create views:", err);
      process.exit(1);
    });
}
