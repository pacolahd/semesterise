import { InferModelFromColumns, sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgView,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { flatten } from "valibot";

export const studentCourseStatusView = pgView("student_course_status_view", {
  studentCourseId: varchar("student_course_id").primaryKey(),

  authId: uuid("auth_id").notNull(),
  studentId: varchar("student_id").notNull(),
  semesterId: varchar("semester_id"),

  yearTaken: integer("year_taken"), // e.g. 1, 2, 3, 4
  semesterTaken: integer("semester_taken"), // e.g. 1, 2 (within program year)
  wasSummerSemester: boolean("was_summer_semester"),

  courseCode: varchar("course_code").notNull(),
  status: varchar("status").notNull(),
  categoryName: text("category_name").notNull(),
  credits: decimal("credits"),

  grade: varchar("grade"),
  gradeNumericValue: decimal("grade_numeric_value", {
    precision: 5,
    scale: 2,
  }),
  minimumGradeRequired: varchar("minimum_grade_required"),
  minNumericValueRequired: decimal("min_numeric_value_required", {
    precision: 5,
    scale: 2,
  }),

  passed: boolean("passed"),
  retakeNeeded: boolean("retake_needed"),
  voluntaryRetakePossible: boolean("voluntary_retake_possible"),

  totalAttempts: integer("total_attempts"),
  retakeLimitReached: boolean("retake_limit_reached"),
  isLatestAttempt: boolean("is_latest_attempt"),

  departmentCode: varchar("department_code"),
  departmentName: text("department_name"),
  courseTitle: varchar("course_title", { length: 255 }),
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
    sp.auth_id,
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
  sp.auth_id,
  sc.student_id,
  sc.semester_id,

  -- 2. Program semester context
  ssm.program_year as year_taken,
  ssm.program_semester as semester_taken,
  ssm.is_summer as was_summer_semester,

  -- 3. Course Info (handle planned courses)
  sc.course_code,
  sc.status,
  COALESCE(
    sc.category_name,  -- Prioritize manually assigned category for planned courses
    cc.category_name, 
    'Non-Major Electives'
  ) AS category_name,
  COALESCE(sc.placeholder_credits, c.credits) AS credits,  -- Default to placeholder_credits for planned courses

  -- 4. Course fields (allow NULLs for planned courses)
  c.department_code,
  COALESCE(d.name,  'Planned') AS department_name,
  COALESCE(c.title, sc.placeholder_title, 'Planned Course') AS course_title,

  -- 5. Grade Info (null for planned courses)
  sc.grade,
  gt.numeric_value AS grade_numeric_value,
  CASE
   
    WHEN sc.grade = 'P' THEN 'P'
    WHEN cgr.minimum_grade IS NOT NULL THEN cgr.minimum_grade
    WHEN EXISTS (SELECT 1 FROM prerequisite_courses pc WHERE pc.course_code = sc.course_code)
      OR COALESCE(
        sc.category_name,  -- Check both student course category
        cc.category_name,  -- and categorized course
        ''
      ) = 'Required Major Classes'
      THEN 'D+'
    ELSE 'D'
  END AS minimum_grade_required,
  CASE
   
    WHEN sc.grade = 'P' THEN NULL
    WHEN cgr.minimum_grade IS NOT NULL THEN 
      (SELECT numeric_value FROM grade_types WHERE grade = cgr.minimum_grade)
    WHEN EXISTS (SELECT 1 FROM prerequisite_courses pc WHERE pc.course_code = sc.course_code)
      OR COALESCE(
        sc.category_name,
        cc.category_name, 
        ''
      ) = 'Required Major Classes'
      THEN (SELECT numeric_value FROM grade_types WHERE grade = 'D+')
    ELSE (SELECT numeric_value FROM grade_types WHERE grade = 'D')
  END AS min_numeric_value_required,

  -- 6. Pass/Retake Logic (always false for planned)
  CASE
    WHEN sc.status = 'planned' THEN NULL
    ELSE NOT (
      CASE
        WHEN sc.grade = 'P' THEN false
        WHEN cgr.minimum_grade IS NOT NULL THEN 
          COALESCE(gt.numeric_value, 0) < (
            SELECT numeric_value FROM grade_types WHERE grade = cgr.minimum_grade
          )
        WHEN EXISTS (SELECT 1 FROM prerequisite_courses pc WHERE pc.course_code = sc.course_code)
          OR COALESCE(
            sc.category_name,
            cc.category_name,
            ''
          ) = 'Required Major Classes'
          THEN sc.grade IN ('D', 'E', 'I')
        ELSE sc.grade IN ('E', 'I')
      END
    )
  END AS passed,

  CASE
    WHEN sc.status = 'planned' THEN false
    WHEN sc.grade = 'P' THEN false
    WHEN cgr.minimum_grade IS NOT NULL THEN 
      COALESCE(gt.numeric_value, 0) < (
        SELECT numeric_value FROM grade_types WHERE grade = cgr.minimum_grade
      )
    WHEN EXISTS (SELECT 1 FROM prerequisite_courses pc WHERE pc.course_code = sc.course_code)
      OR COALESCE(
        sc.category_name,
        cc.category_name,
        ''
      ) = 'Required Major Classes'
      THEN sc.grade IN ('D', 'E', 'I')
    ELSE sc.grade IN ('E', 'I')
  END AS retake_needed,

  CASE
    WHEN sc.status = 'planned' THEN false
    WHEN COALESCE(ca.total_attempts, 0) >= 3 THEN false
    WHEN sc.grade IN ('D+', 'D') AND NOT (
      CASE
        WHEN cgr.minimum_grade IS NOT NULL THEN 
          COALESCE(gt.numeric_value, 0) < (
            SELECT numeric_value FROM grade_types WHERE grade = cgr.minimum_grade
          )
        WHEN EXISTS (SELECT 1 FROM prerequisite_courses pc WHERE pc.course_code = sc.course_code)
          OR COALESCE(
            sc.category_name,
            cc.category_name,
            ''
          ) = 'Required Major Classes'
          THEN sc.grade IN ('D', 'E', 'I')
        ELSE sc.grade IN ('E', 'I')
      END
    ) THEN true
    ELSE false
  END AS voluntary_retake_possible,

  -- 7. Attempt Info
  COALESCE(ca.total_attempts, 1) AS total_attempts,
  CASE
   WHEN sc.course_code = null THEN true
   ELSE (ar.row_num = 1) 
  END AS is_latest_attempt,
  CASE
    WHEN sc.course_code = null THEN NULL
    ELSE COALESCE(ca.total_attempts, 0) >= 3 OR sc.grade IS NULL
  END AS retake_limit_reached

FROM student_courses sc
LEFT JOIN student_semester_mappings ssm 
  ON sc.semester_id = ssm.academic_semester_id
JOIN attempt_ranking ar
  ON sc.id = ar.student_course_id
LEFT JOIN courses c ON sc.course_code = c.code  -- Changed to LEFT JOIN
LEFT JOIN departments d ON c.department_code = d.code  -- Changed to LEFT JOIN
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
  AND cc.student_id = sc.student_id;
`
);

export type StudentCourseStatusRecord = InferModelFromColumns<
  (typeof studentCourseStatusView)["_"]["selectedFields"]
>;
