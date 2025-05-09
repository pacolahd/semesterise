import { InferModelFromColumns, sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgView,
  text,
  varchar,
} from "drizzle-orm/pg-core";

export const studentDegreeRequirementProgressView = pgView(
  "student_degree_requirement_progress_view",
  {
    authId: varchar("auth_id").primaryKey(),
    studentId: varchar("student_id").notNull(),
    parentCategory: text("parent_category").notNull(),
    categoryName: text("category_name").notNull(),
    subCategory: text("sub_category"),
    coursesRequired: integer("courses_required").notNull(),
    creditsRequired: decimal("credits_required").notNull(),
    coursesCompleted: integer("courses_completed").notNull(),
    creditsCompleted: decimal("credits_completed").notNull(),
    coursesRemaining: integer("courses_remaining").notNull(),
    creditsRemaining: decimal("credits_remaining").notNull(),
    progressPercentage: decimal("progress_percentage", {
      precision: 5,
      scale: 2,
    }),
    requirementMet: boolean("requirement_met").notNull(),
  }
).as(
  sql`
WITH student_info AS (
  SELECT
    sp.auth_id,
    sp.student_id,
    sp.major_code,
    sp.math_track_name,
    sp.cohort_year,
    sp.capstone_option_name
  FROM student_profiles sp
),
category_requirements AS (
  SELECT
    src.student_id,
    src.auth_id,
    src.parent_category,
    CASE
      WHEN src.category_name IN ('Major Electives', 'Non-Major Electives')
      THEN COALESCE(src.sub_category, src.category_name)
      ELSE src.category_name
    END AS requirement_category,
    src.category_name AS original_category,
    COUNT(*) AS courses_required,
    COALESCE(SUM(src.credits), 0) AS credits_required,
    BOOL_OR(
      src.sub_category = 'Free Elective' AND si.major_code = 'MIS'
    ) AS enforce_max
  FROM student_required_courses_view src
  JOIN student_info si ON src.student_id = si.student_id
  GROUP BY
    src.student_id,
    src.auth_id,
    src.parent_category,
    CASE
      WHEN src.category_name IN ('Major Electives', 'Non-Major Electives')
      THEN COALESCE(src.sub_category, src.category_name)
      ELSE src.category_name
    END,
    src.category_name
),
completed_courses AS (
  SELECT
    sccsv.student_id,
    sccsv.course_code,
    sccsv.credits,
\tsccsv.course_title,
    sccsv.parent_category,
    sccsv.category_name,
    sccsv.sub_category
  FROM student_course_categorized_status_view sccsv
  WHERE sccsv.status = 'planned' or sccsv.passed = true AND sccsv.is_latest_attempt = true
),
category_progress AS (
  SELECT
    cr.student_id,
    cr.auth_id,
    cr.parent_category,
    cr.original_category AS category_name,  -- Directly use original category
    CASE
      WHEN cr.original_category = 'Non-Major Electives' 
      THEN cr.requirement_category  -- Show sub-category for electives
      ELSE NULL
    END AS sub_category,
    cr.courses_required,
    cr.credits_required,
\tCOUNT(DISTINCT cc.course_title) AS raw_courses_completed,
    COALESCE(SUM(cc.credits), 0) AS raw_credits_completed,
    cr.enforce_max
  FROM category_requirements cr
  LEFT JOIN completed_courses cc
    ON cr.student_id = cc.student_id
    AND (
      -- For Non-Major Electives, match sub-category-to-sub-category
      (cr.original_category = 'Non-Major Electives' AND cc.sub_category = cr.requirement_category)
      OR
      -- For other categories, match category-to-category
      (cr.original_category <> 'Non-Major Electives' AND cc.category_name = cr.requirement_category)
    )
  GROUP BY
    cr.student_id,
    cr.auth_id,
    cr.parent_category,
    cr.original_category,
    cr.requirement_category,
    cr.courses_required,
    cr.credits_required,
    cr.enforce_max
),
final_progress AS (
  SELECT
    student_id,
    auth_id,
    parent_category,
    category_name,
    sub_category,
    courses_required,
    credits_required,
    CASE WHEN enforce_max THEN LEAST(raw_courses_completed, courses_required)
    ELSE raw_courses_completed END AS courses_completed,
    CASE WHEN enforce_max THEN LEAST(raw_credits_completed, credits_required)
    ELSE raw_credits_completed END AS credits_completed,
    GREATEST(courses_required -
      CASE WHEN enforce_max THEN LEAST(raw_courses_completed, courses_required)
      ELSE raw_courses_completed END, 0) AS courses_remaining,
    GREATEST(credits_required -
      CASE WHEN enforce_max THEN LEAST(raw_credits_completed, credits_required)
      ELSE raw_credits_completed END, 0) AS credits_remaining,
    ROUND(LEAST(
      CASE WHEN courses_required > 0
      THEN (CASE WHEN enforce_max
        THEN LEAST(raw_courses_completed, courses_required)
        ELSE raw_courses_completed END
        / courses_required::NUMERIC) * 100
      ELSE 0 END,
      100), 2) AS progress_percentage,
    (CASE WHEN enforce_max THEN raw_courses_completed >= courses_required
      ELSE raw_courses_completed >= courses_required END
      AND raw_credits_completed >= credits_required) AS requirement_met
  FROM category_progress
)
SELECT
  fp.student_id,
  fp.auth_id,
  fp.parent_category,
  fp.category_name,
  fp.sub_category,
  fp.courses_required,
  fp.credits_required,
  fp.courses_completed,
  fp.credits_completed,
  fp.courses_remaining,
  fp.credits_remaining,
  fp.progress_percentage,
  fp.requirement_met
FROM final_progress fp
`
);

export type StudentDegreeRequirementProgressRecord = InferModelFromColumns<
  (typeof studentDegreeRequirementProgressView)["_"]["selectedFields"]
>;
