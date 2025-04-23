import { InferModelFromColumns, sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgView,
  text,
  varchar,
} from "drizzle-orm/pg-core";

export const studentRemainingRequirementsView = pgView(
  "student_remaining_requirements_view",
  {
    authId: varchar("auth_id"),
    studentId: varchar("student_id"),
    parentCategory: text("parent_category"),
    categoryName: text("category_name"),
    subCategory: text("sub_category"),
    courseCode: varchar("course_code"),
    courseTitle: text("course_title"),
    credits: decimal("credits", { precision: 5, scale: 1 }),
    recommendedYear: integer("recommended_year"),
    recommendedSemester: integer("recommended_semester"),
    offeredInSemesters: text("offered_in_semesters").array(),
    requirementType: varchar("requirement_type", { length: 20 }),
    priorityOrder: integer("priority_order"),
  }
).as(sql`
WITH requirement_base AS (
  SELECT 
    req.auth_id,
    req.student_id,
    req.parent_category,
    req.category_name,
    req.sub_category,
    req.course_code,
    req.course_title,
    req.credits,
    req.recommended_year,
    req.recommended_semester,
    req.offered_in_semesters,
    req.is_required,
    CASE 
      WHEN req.course_code IS NULL THEN 'elective_placeholder'
      ELSE 'concrete_course' 
    END AS course_type
  FROM student_required_courses_view req
),

progress_data AS (
  SELECT 
    prg.auth_id,
    prg.parent_category,
    prg.category_name,
    prg.sub_category,
    prg.courses_remaining,
    prg.credits_remaining
  FROM student_degree_requirement_progress_view prg
),

completed_courses AS (
  SELECT 
    cat.auth_id,
    cat.student_id,
    cat.parent_category,
    cat.category_name,
    cat.sub_category,
    cat.course_code,
    cat.status,
    cat.passed,
    cat.retake_needed
  FROM student_course_categorized_status_view cat
  WHERE cat.is_latest_attempt = true  -- Planned courses are included insitu
),

remaining_concrete_courses AS (
  SELECT 
    rb.auth_id,
    rb.student_id,
    rb.parent_category,
    rb.category_name,
    rb.sub_category,
    rb.course_code,
    rb.course_title,
    rb.credits,
    rb.recommended_year,
    rb.recommended_semester,
    rb.offered_in_semesters,
    'required_course' AS requirement_type,
    ROW_NUMBER() OVER (
      PARTITION BY rb.parent_category, rb.category_name, rb.sub_category 
      ORDER BY 
        rb.recommended_year NULLS LAST, 
        rb.recommended_semester NULLS LAST
    ) AS priority_order
  FROM requirement_base rb
  WHERE rb.course_type = 'concrete_course'
    AND NOT EXISTS (
      SELECT 1
      FROM completed_courses cc
      WHERE cc.course_code = rb.course_code
        -- AND cc.passed = true
    )
),

remaining_electives AS (
  SELECT
    rb.auth_id,
    rb.student_id,
    rb.parent_category,
    rb.category_name,
    rb.sub_category,
    NULL AS course_code,
    rb.course_title,
    rb.credits,
    NULL::integer AS recommended_year,
    NULL::integer AS recommended_semester,
    NULL::semester_offering[] AS offered_in_semesters,  -- Fixed type casting
    'elective_placeholder' AS requirement_type,
    ROW_NUMBER() OVER (
      PARTITION BY rb.parent_category, rb.category_name, rb.sub_category 
      ORDER BY rb.course_title
    ) AS priority_order
  FROM requirement_base rb
  JOIN progress_data pd 
    ON rb.auth_id = pd.auth_id
    AND rb.parent_category = pd.parent_category
    AND rb.category_name = pd.category_name
    AND COALESCE(rb.sub_category, '') = COALESCE(pd.sub_category, '')
  WHERE rb.course_type = 'elective_placeholder'
    AND pd.courses_remaining > 0
),

retake_requirements AS (
  SELECT 
    cc.auth_id,
    cc.student_id,
    cc.parent_category,
    cc.category_name,
    cc.sub_category,
    cc.course_code,
    c.title AS course_title,
    c.credits,
    NULL::integer AS recommended_year,
    NULL::integer AS recommended_semester,
    c.offered_in_semesters,  -- Already correct type from courses table
    'retake_required' AS requirement_type,
    0 AS priority_order
  FROM completed_courses cc
  JOIN courses c ON cc.course_code = c.code
  WHERE cc.retake_needed = true
    AND cc.passed = false
    AND EXISTS (
      SELECT 1
      FROM requirement_base rb
      WHERE rb.course_code = cc.course_code
        AND rb.is_required = true
    )
)

-- Combine all requirement types
SELECT * FROM retake_requirements
UNION ALL
SELECT * FROM remaining_concrete_courses
UNION ALL
SELECT * FROM remaining_electives
ORDER BY
  priority_order,
  recommended_year NULLS LAST,
  recommended_semester NULLS LAST,
  parent_category,
  category_name,
  sub_category
`);

export type StudentRemainingRequirementsRecord = InferModelFromColumns<
  (typeof studentRemainingRequirementsView)["_"]["selectedFields"]
>;
