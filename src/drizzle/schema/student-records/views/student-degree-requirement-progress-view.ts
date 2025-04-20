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
    student_id: varchar("student_id").primaryKey(),
    parent_category: text("parent_category"),
    category_name: text("category_name"),
    sub_category: text("sub_category"),
    courses_required: integer("courses_required"),
    credits_required: integer("credits_required"),
    courses_completed: integer("courses_completed"),
    credits_completed: integer("credits_completed"),
    courses_remaining: integer("courses_remaining"),
    credits_remaining: integer("credits_remaining"),
    progress_percentage: decimal("progress_percentage", {
      precision: 5,
      scale: 2,
    }),
    requirement_met: boolean("requirement_met"),
  }
).as(
  sql`
  WITH student_info AS (
    SELECT 
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
      src.parent_category,
      CASE
        WHEN src.category_name IN ('Major Electives', 'Non-Major Electives')
        THEN src.sub_category
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
      src.parent_category,
      CASE
        WHEN src.category_name IN ('Major Electives', 'Non-Major Electives')
        THEN src.sub_category
        ELSE src.category_name
      END,
      src.category_name
  ),
  completed_courses AS (
    SELECT 
      scsv.student_id,
      scsv.course_code,
      scsv.credits,
      scsv.department_name,
      scsv.course_title,
      CASE 
        WHEN scsv.department_name = 'Humanities and Social Sciences'
        AND (scsv.course_title ILIKE '%africa%' OR scsv.course_title ILIKE '%ghana%')
        THEN 'Africana'
        WHEN scsv.category_name IS NULL THEN 'General Elective'
        ELSE scsv.category_name
      END AS detailed_category
    FROM student_course_status_view scsv
    WHERE scsv.passed = true AND scsv.is_latest_attempt = true 
  ),
  prioritized_courses AS (
    SELECT
      cc.student_id,
      cc.course_code,
      cc.credits,
      cc.detailed_category,
      COALESCE(cr.requirement_category, 'General Elective') AS requirement_category,
      cr.parent_category,
      CASE
        WHEN cc.detailed_category = 'Africana' THEN 1
        WHEN cr.requirement_category = 'Free Elective' THEN 2
        WHEN cr.parent_category = 'MAJOR' THEN 3
        ELSE 4
      END AS assignment_priority
    FROM completed_courses cc
    LEFT JOIN category_requirements cr
      ON cc.student_id = cr.student_id
      AND cc.detailed_category = cr.requirement_category
  ),
  assigned_courses AS (
    SELECT DISTINCT ON (student_id, course_code)
      student_id,
      course_code,
      credits,
      FIRST_VALUE(requirement_category) OVER (
        PARTITION BY student_id, course_code
        ORDER BY assignment_priority
      ) AS assigned_category
    FROM prioritized_courses
  ),
  category_progress AS (
    SELECT
      cr.student_id,
      cr.parent_category,
      CASE
        WHEN cr.original_category IN ('Major Electives', 'Non-Major Electives')
        THEN cr.original_category
        ELSE cr.requirement_category
      END AS category_name,
      CASE
        WHEN cr.original_category IN ('Major Electives', 'Non-Major Electives')
        THEN cr.requirement_category
        ELSE NULL
      END AS sub_category,
      cr.courses_required,
      cr.credits_required,
      COUNT(DISTINCT ac.course_code) AS raw_courses_completed,
      COALESCE(SUM(ac.credits), 0) AS raw_credits_completed,
      cr.enforce_max
    FROM category_requirements cr
    LEFT JOIN assigned_courses ac
      ON cr.student_id = ac.student_id
      AND cr.requirement_category = ac.assigned_category
    GROUP BY
      cr.student_id,
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
    fp.parent_category,
    fp.category_name,
    CASE 
      WHEN fp.category_name = 'Non-Major Electives' THEN fp.sub_category
      ELSE NULL 
    END AS sub_category,
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
