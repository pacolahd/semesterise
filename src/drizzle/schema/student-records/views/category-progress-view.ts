// src/drizzle/schema/student-records/views/category-progress-view.ts
import { InferModelFromColumns, sql } from "drizzle-orm";
import { decimal, integer, pgView, varchar } from "drizzle-orm/pg-core";

export const categoryProgressView = pgView("category_progress_view", {
  studentId: varchar("student_id"),
  categoryName: varchar("category_name"),
  creditsRequired: decimal("credits_required", { precision: 4, scale: 1 }),
  creditsCompleted: decimal("credits_completed", { precision: 4, scale: 1 }),
  coursesRequired: integer("courses_required"),
  coursesCompleted: integer("courses_completed"),
  progressPercentage: decimal("progress_percentage", {
    precision: 5,
    scale: 2,
  }),
}).as(
  sql`
    WITH student_major_requirements AS (
      -- Get requirements for each student based on major and cohort year
      SELECT
        sp.student_id,
        cc.name AS category_name,
        dr.min_credits AS credits_required,
        dr.min_courses AS courses_required
      FROM student_profiles sp
      JOIN degree_requirements dr ON 
        sp.major_code = dr.major_code AND 
        (sp.cohort_year >= dr.applicable_from_cohort_year OR dr.applicable_from_cohort_year IS NULL) AND
        (sp.cohort_year <= dr.applicable_until_cohort_year OR dr.applicable_until_cohort_year IS NULL)
      JOIN course_categories cc ON dr.category_name = cc.name
    ),
    student_course_completions AS (
      -- Calculate completed credits and courses by category for each student
      SELECT
        sc.student_id,
        COALESCE(sc.category_name, sc_cat.category_name) AS category_name,
        SUM(CASE 
          WHEN sc.status = 'verified' AND sc.is_used_for_requirement = true AND EXISTS (
            SELECT 1 FROM grade_types g WHERE g.grade = sc.grade AND g.is_passing = true
          )
          THEN c.credits 
          ELSE 0 
        END) AS credits_completed,
        COUNT(DISTINCT CASE 
          WHEN sc.status = 'verified' AND sc.is_used_for_requirement = true AND EXISTS (
            SELECT 1 FROM grade_types g WHERE g.grade = sc.grade AND g.is_passing = true
          )
          THEN sc.course_code
          ELSE NULL 
        END) AS courses_completed
      FROM student_courses sc
      JOIN courses c ON sc.course_code = c.code
      -- Handle course categorization (either from student course or from course categorization table)
      LEFT JOIN course_categorization sc_cat ON 
        sc.course_code = sc_cat.course_code AND
        (sc_cat.major_group IS NULL OR EXISTS (
          SELECT 1 FROM student_profiles sp 
          WHERE sp.student_id = sc.student_id AND (
            sc_cat.major_group = sp.major_code OR 
            sc_cat.major_group = 'ALL' OR
            (sc_cat.major_group = 'NON-ENG' AND sp.major_code NOT LIKE 'ENG%')
          )
        ))
      -- Handle math track requirements when applicable
      LEFT JOIN student_profiles sp ON sc.student_id = sp.student_id
      LEFT JOIN course_categorization sc_math ON 
        sc.course_code = sc_math.course_code AND 
        sc_math.math_track_name = sp.math_track_name
      WHERE sc.category_name IS NOT NULL OR sc_cat.category_name IS NOT NULL OR sc_math.category_name IS NOT NULL
      GROUP BY sc.student_id, COALESCE(sc.category_name, sc_cat.category_name)
    )
    SELECT
      smr.student_id,
      smr.category_name,
      smr.credits_required,
      COALESCE(scc.credits_completed, 0) AS credits_completed,
      smr.courses_required,
      COALESCE(scc.courses_completed, 0) AS courses_completed,
      CASE 
        WHEN smr.credits_required > 0 
        THEN LEAST(COALESCE(scc.credits_completed, 0) / smr.credits_required * 100, 100)
        ELSE 0
      END AS progress_percentage
    FROM student_major_requirements smr
    LEFT JOIN student_course_completions scc ON 
      smr.student_id = scc.student_id AND 
      smr.category_name = scc.category_name
  `
);

export type CategoryProgress = InferModelFromColumns<
  (typeof categoryProgressView)["_"]["selectedFields"]
>;
