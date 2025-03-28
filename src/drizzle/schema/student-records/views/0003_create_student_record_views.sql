-- Create the semester_credit_summaries_view
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
GROUP BY sc.student_id, sc.semester_id;

-- Create the category_progress_view
CREATE OR REPLACE VIEW category_progress_view AS
WITH student_major_requirements AS (
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
  smr.category_name = scc.category_name;

-- Create the student_graduation_progress_view
CREATE OR REPLACE VIEW student_graduation_progress_view AS
SELECT
  cp.student_id,
  CURRENT_TIMESTAMP AS last_audit_date,
  CASE
    WHEN SUM(cp.credits_required) > 0
    THEN (SUM(cp.credits_completed) / SUM(cp.credits_required)) * 100
    ELSE 0
  END AS overall_progress_percentage,
  SUM(cp.credits_completed) AS credits_completed,
  GREATEST(SUM(cp.credits_required) - SUM(cp.credits_completed), 0) AS credits_remaining,
  COUNT(CASE WHEN cp.progress_percentage >= 100 THEN 1 ELSE NULL END) AS requirements_completed,
  COUNT(CASE WHEN cp.progress_percentage < 100 THEN 1 ELSE NULL END) AS requirements_remaining,
  CASE
    WHEN COUNT(CASE WHEN cp.progress_percentage < 100 THEN 1 ELSE NULL END) = 0 THEN true
    WHEN (SUM(cp.credits_completed) / NULLIF(SUM(cp.credits_required), 0)) >= 0.8 THEN true
    ELSE false
  END AS on_track_for_graduation,
  (
    SELECT sp.expected_graduation_date
    FROM student_profiles sp
    WHERE sp.student_id = cp.student_id
  ) AS projected_graduation_date
FROM category_progress_view cp
GROUP BY cp.student_id;

