import { InferModelFromColumns, sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgView,
  text,
  varchar,
} from "drizzle-orm/pg-core";

export const studentCourseStatusView = pgView("student_course_status_view", {
  student_course_id: varchar("student_course_id").primaryKey(),
  student_id: varchar("student_id"),
  semester_id: varchar("semester_id"),

  year_taken: integer("program_year"), // e.g. 1, 2, 3, 4
  semester_taken: integer("program_semester"), // e.g. 1, 2 (within program year)
  was_summer_semester: boolean("is_summer"),

  course_code: varchar("course_code"),
  category_name: text("category_name"),
  credits: integer("credits"),

  grade: varchar("grade"),
  grade_numeric_value: decimal("grade_numeric_value", {
    precision: 5,
    scale: 2,
  }),
  minimum_grade_required: varchar("minimum_grade_required"),
  min_numeric_value_required: decimal("min_numeric_value_required", {
    precision: 5,
    scale: 2,
  }),

  passed: boolean("passed"),
  retake_needed: boolean("retake_needed"),
  voluntary_retake_possible: boolean("voluntary_retake_possible"),

  total_attempts: integer("total_attempts"),
  retake_limit_reached: boolean("retake_limit_reached"),
  is_latest_attempt: boolean("is_latest_attempt"),

  department_code: varchar("department_code"),
  department_name: text("department_name"),
  course_title: varchar("course_title", { length: 255 }),
}).as(
  sql`
WITH attempt_ranking AS (
  SELECT 
    sc.id AS student_course_id,
    sc.student_id,
    sc.course_code,
    ROW_NUMBER() OVER (
      PARTITION BY sc.student_id, sc.course_code 
      ORDER BY ac.start_date DESC
    ) AS row_num
  FROM student_courses sc
  JOIN academic_semesters ac ON sc.semester_id = ac.id
),
course_attempts AS (
  SELECT
    sc.student_id,
    sc.course_code,
    COUNT(*) AS total_attempts
  FROM student_courses sc
  GROUP BY sc.student_id, sc.course_code
),
course_category AS (
  SELECT 
    cc.course_code,
    sp.student_id,
    COALESCE(cc.category_name, 'Non-Major Electives') AS category_name,
    ROW_NUMBER() OVER (
      PARTITION BY cc.course_code, sp.student_id
      ORDER BY 
        CASE 
          WHEN cc.major_group = sp.major_code THEN 1
          WHEN cc.major_group IN ('ENG', 'NON-ENG') AND (
            (sp.major_code IN ('CE', 'EE', 'ME') AND cc.major_group = 'ENG') OR
            (sp.major_code NOT IN ('CE', 'EE', 'ME') AND cc.major_group = 'NON-ENG')
          ) THEN 2
          WHEN cc.major_group = 'ALL' THEN 3
          ELSE 4
        END
    ) AS row_priority
  FROM student_profiles sp
  JOIN course_categorization cc ON true
  WHERE cc.course_code IS NOT NULL
),
categorized_course AS (
  SELECT course_code, student_id, category_name
  FROM course_category
  WHERE row_priority = 1
),
prerequisite_courses AS (
  SELECT DISTINCT prerequisite_course_code AS course_code
  FROM prerequisite_courses
)
SELECT
  -- 1. Identifiers
  sc.id AS student_course_id,
  sc.student_id,
  sc.semester_id,

  -- 2. Program semester context
  ssm.program_year as year_taken,
  ssm.program_semester as semester_taken,
  ssm.is_summer as was_summer_semester,

  -- 3. Course Info
  sc.course_code,
  COALESCE(cc.category_name, 'Non-Major Electives') AS category_name,
  c.credits,

  -- 4. Course fields
  c.department_code,
  d.name AS department_name,
  c.title AS course_title,

  -- 5. Grade Info
  sc.grade,
  gt.numeric_value AS grade_numeric_value,
  CASE
    WHEN sc.grade = 'P' THEN 'P'
    WHEN cgr.minimum_grade IS NOT NULL THEN cgr.minimum_grade
    WHEN EXISTS (SELECT 1 FROM prerequisite_courses pc WHERE pc.course_code = sc.course_code)
      OR COALESCE(cc.category_name, '') = 'Required Major Classes'
      THEN 'D+'
    ELSE 'D'
  END AS minimum_grade_required,
  CASE
    WHEN sc.grade = 'P' THEN NULL
    WHEN cgr.minimum_grade IS NOT NULL THEN 
      (SELECT numeric_value FROM grade_types WHERE grade = cgr.minimum_grade)
    WHEN EXISTS (SELECT 1 FROM prerequisite_courses pc WHERE pc.course_code = sc.course_code)
      OR COALESCE(cc.category_name, '') = 'Required Major Classes'
      THEN (SELECT numeric_value FROM grade_types WHERE grade = 'D+')
    ELSE (SELECT numeric_value FROM grade_types WHERE grade = 'D')
  END AS min_numeric_value_required,

  -- 6. Pass/Retake Logic
  NOT (
    CASE
      WHEN sc.grade = 'P' THEN false
      WHEN cgr.minimum_grade IS NOT NULL THEN 
        COALESCE(gt.numeric_value, 0) < (
          SELECT numeric_value FROM grade_types WHERE grade = cgr.minimum_grade
        )
      WHEN EXISTS (SELECT 1 FROM prerequisite_courses pc WHERE pc.course_code = sc.course_code)
        OR COALESCE(cc.category_name, '') = 'Required Major Classes'
        THEN sc.grade IN ('D', 'E', 'I')
      ELSE sc.grade IN ('E', 'I')
    END
  ) AS passed,

  CASE
    WHEN sc.grade = 'P' THEN false
    WHEN cgr.minimum_grade IS NOT NULL THEN 
      COALESCE(gt.numeric_value, 0) < (
        SELECT numeric_value FROM grade_types WHERE grade = cgr.minimum_grade
      )
    WHEN EXISTS (SELECT 1 FROM prerequisite_courses pc WHERE pc.course_code = sc.course_code)
      OR COALESCE(cc.category_name, '') = 'Required Major Classes'
      THEN sc.grade IN ('D', 'E', 'I')
    ELSE sc.grade IN ('E', 'I')
  END AS retake_needed,

  CASE
    WHEN COALESCE(ca.total_attempts, 0) >= 3 THEN false
    WHEN sc.grade IN ('D+', 'D') AND NOT (
      CASE
        WHEN cgr.minimum_grade IS NOT NULL THEN 
          COALESCE(gt.numeric_value, 0) < (
            SELECT numeric_value FROM grade_types WHERE grade = cgr.minimum_grade
          )
        WHEN EXISTS (SELECT 1 FROM prerequisite_courses pc WHERE pc.course_code = sc.course_code)
          OR COALESCE(cc.category_name, '') = 'Required Major Classes'
          THEN sc.grade IN ('D', 'E', 'I')
        ELSE sc.grade IN ('E', 'I')
      END
    ) THEN true
    ELSE false
  END AS voluntary_retake_possible,

  -- 7. Attempt Info
  COALESCE(ca.total_attempts, 0) AS total_attempts,
  -- NEW: Add is_latest_attempt field
  (ar.row_num = 1) AS is_latest_attempt,
  COALESCE(ca.total_attempts, 0) >= 3 OR sc.grade IS NULL AS retake_limit_reached

FROM student_courses sc
LEFT JOIN student_semester_mappings ssm 
  ON sc.semester_id = ssm.academic_semester_id
JOIN attempt_ranking ar
  ON sc.id = ar.student_course_id
JOIN courses c ON sc.course_code = c.code
JOIN departments d ON c.department_code = d.code
JOIN student_profiles sp ON sc.student_id = sp.student_id
LEFT JOIN grade_types gt ON sc.grade = gt.grade
LEFT JOIN course_grade_requirements cgr 
  ON sc.course_code = cgr.course_code 
  AND sp.major_code = cgr.major_code
  AND (
    sp.cohort_year BETWEEN cgr.applicable_from_cohort_year AND cgr.applicable_until_cohort_year
    OR (cgr.applicable_from_cohort_year IS NULL AND cgr.applicable_until_cohort_year IS NULL)
  )
LEFT JOIN course_attempts ca 
  ON sc.student_id = ca.student_id 
  AND sc.course_code = ca.course_code
LEFT JOIN categorized_course cc 
  ON cc.course_code = sc.course_code 
  AND cc.student_id = sc.student_id
`
);

export type StudentCourseStatusRecord = InferModelFromColumns<
  (typeof studentCourseStatusView)["_"]["selectedFields"]
>;
