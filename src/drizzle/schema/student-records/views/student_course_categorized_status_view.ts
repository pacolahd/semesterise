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

export const studentCourseCategorizedStatusView = pgView(
  "student_course_categorized_status_view",
  {
    studentCourseId: varchar("student_course_id").primaryKey(),

    authId: uuid("auth_id").notNull(),
    studentId: varchar("student_id").notNull(),
    semesterId: varchar("semester_id"),

    yearTaken: integer("year_taken"), // e.g. 1, 2, 3, 4
    semesterTaken: integer("semester_taken"), // e.g. 1, 2 (within program year)
    wasSummerSemester: boolean("was_summer_semester"),

    courseCode: varchar("course_code").notNull(),
    status: varchar("status").notNull(),
    parentCategory: text("parent_category").notNull(),
    categoryName: text("category_name").notNull(),
    subCategory: text("sub_category").notNull(),
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
  }
).as(
  sql`
WITH all_courses AS (
  SELECT 
    scsv.*,
    CASE
      When(scsv.course_title ILIKE '%africa%' OR scsv.course_title ILIKE '%ghana%'  OR scsv.course_title ILIKE '%politics%')
        THEN 'Africana'
      ELSE scsv.category_name
    END AS detailed_category
  FROM student_course_status_view scsv
),

category_requirements AS (
  SELECT
    src.student_id,
    src.parent_category,
    src.category_name,
    CASE
      WHEN src.category_name = 'Non-Major Electives' 
      THEN src.sub_category  -- Preserve sub-category hierarchy
      ELSE src.category_name
    END AS requirement_category
  FROM student_required_courses_view src
),

prioritized_courses AS (
  SELECT
    ac.*,
    COALESCE(cr.requirement_category, 'General Elective') AS requirement_category,
    cr.parent_category,
    CASE
      -- Highest priority: Africana sub-category
      WHEN ac.detailed_category = 'Africana' THEN 1
      -- Second priority: Free Elective sub-category
      WHEN cr.requirement_category = 'Free Elective' THEN 2
      -- Third priority: Major-related categories
      WHEN cr.parent_category = 'MAJOR' THEN 3
      ELSE 4
    END AS assignment_priority
  FROM all_courses ac
  LEFT JOIN category_requirements cr
    ON ac.student_id = cr.student_id
    AND (
      ac.detailed_category = cr.requirement_category
      OR (ac.detailed_category IS NULL AND cr.requirement_category = 'Non-Major Electives')
    )
),

assigned_courses AS (
  SELECT DISTINCT ON (student_course_id)
    *,
    FIRST_VALUE(requirement_category) OVER (
      PARTITION BY student_id, course_title
      ORDER BY assignment_priority
    ) AS final_sub_category  -- This is the critical rename
  FROM prioritized_courses
),

elective_fulfillment AS (
  SELECT
    student_id,
    COUNT(*) FILTER (
      WHERE passed AND final_sub_category = 'Major Electives'  -- Fixed here
    ) AS major_electives_fulfilled,
    COUNT(*) FILTER (
      WHERE passed AND final_sub_category = 'Non-Major Electives'  -- Fixed here
    ) AS non_major_electives_fulfilled,
    COUNT(*) FILTER (
      WHERE passed AND final_sub_category = 'Africana'  -- Fixed here
    ) AS africana_fulfilled
  FROM assigned_courses
  GROUP BY student_id
),

free_elective_assignments AS (
  SELECT
    ac.student_course_id,
    CASE
      WHEN sp.major_code = 'MIS'
        AND ef.major_electives_fulfilled >= 2
        AND ef.non_major_electives_fulfilled >= 2
        AND ef.africana_fulfilled >= 1
        AND ROW_NUMBER() OVER (
          PARTITION BY ac.student_id
          ORDER BY ac.year_taken, ac.semester_taken
        ) = 1
      THEN 'Free Elective'
    END AS free_elective_candidate
  FROM assigned_courses ac
  JOIN student_profiles sp ON ac.student_id = sp.student_id
  JOIN elective_fulfillment ef ON ac.student_id = ef.student_id
  WHERE ac.passed
    AND ac.final_sub_category IN ('General Elective', 'Non-Major Electives')  -- Fixed here
)

SELECT
  -- Original fields
  ac.student_course_id,
  ac.auth_id,
  ac.student_id,
  ac.semester_id,
  ac.status,
  ac.year_taken,
  ac.semester_taken,
  ac.was_summer_semester,
  ac.course_code,
  ac.credits,
  ac.grade,
  ac.grade_numeric_value,
  ac.minimum_grade_required,
  ac.min_numeric_value_required,
  ac.passed,
  ac.retake_needed,
  ac.voluntary_retake_possible,
  ac.total_attempts,
  ac.retake_limit_reached,
  ac.is_latest_attempt,
  ac.department_code,
  ac.department_name,
  ac.course_title,
  
  -- Corrected categorization hierarchy
  CASE
    WHEN ac.parent_category = 'MAJOR' THEN 'MAJOR'
    ELSE 'LIBERAL ARTS & SCIENCES CORE'
  END AS parent_category,
  
  CASE
    WHEN ac.final_sub_category IN ('Africana', 'Free Elective') 
    THEN 'Non-Major Electives'
    ELSE ac.final_sub_category
  END AS category_name,
  
  CASE
    WHEN ac.final_sub_category IN ('Africana', 'Free Elective', 'Non-Major Electives')
    THEN ac.final_sub_category
    ELSE NULL
  END AS sub_category

FROM assigned_courses ac
LEFT JOIN free_elective_assignments fea
  ON ac.student_course_id = fea.student_course_id
ORDER BY ac.student_id, ac.year_taken, ac.semester_taken
`
);

export type StudentCourseCategorizedStatusRecord = InferModelFromColumns<
  (typeof studentCourseCategorizedStatusView)["_"]["selectedFields"]
>;
