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

export const studentRequiredCoursesView = pgView(
  "student_required_courses_view",
  {
    authId: uuid("auth_id").primaryKey(),
    studentId: varchar("student_id"),
    parentCategory: text("parent_category"),
    categoryName: text("category_name").notNull(),
    subCategory: text("sub_category"),
    courseCode: varchar("course_code").notNull(),
    courseTitle: text("course_title").notNull(),
    credits: decimal("credits", { precision: 3, scale: 1 }),
    offeredInSemesters: text("offered_in_semesters").array(), // Assuming enum is stored as text
    recommendedYear: integer("recommended_year"),
    recommendedSemester: integer("recommended_semester"),
    isRequired: boolean("is_required"),
  }
).as(
  sql`
WITH student_info AS (
  SELECT
    student_id, major_code, cohort_year,
    math_track_name, capstone_option_name, auth_id
  FROM student_profiles
),
required_courses_base AS (
  SELECT
    sp.student_id,
\tsp.auth_id,
    cc.course_code,
    CASE
      WHEN cc.category_name IN (
        'Humanities & Social Sciences', 'Business', 'Mathematics & Quantitative',
        'Computing', 'Science', 'Research / Project Prep.', 'Non-Major Electives'
      ) THEN 'LIBERAL ARTS & SCIENCES CORE'
      WHEN cc.category_name IN ('Required Major Classes', 'Major Electives', 'Capstone') THEN 'MAJOR'
    END AS parent_category,
    cc.category_name AS category_name,
    cc.category_name AS sub_category,
    c.title AS course_title,
    c.credits,
    c.offered_in_semesters,  -- Added from courses table
    cc.recommended_year,      -- Added from course_categorization
    cc.recommended_semester,  -- Added from course_categorization
    cc.is_required
  FROM student_info sp
  JOIN course_categorization cc
    ON (
      (cc.major_group IS NULL OR cc.major_group = sp.major_code OR cc.major_group = 'ALL' OR
      cc.major_group = CASE
                        WHEN sp.major_code IN ('CE', 'ME', 'EE') THEN 'ENG'
                        ELSE 'NON-ENG'
                      END
      ) AND
      (cc.applicable_from_cohort_year IS NULL OR sp.cohort_year >= cc.applicable_from_cohort_year) AND
      (cc.applicable_until_cohort_year IS NULL OR sp.cohort_year <= cc.applicable_until_cohort_year) AND
      (cc.math_track_name IS NULL OR cc.math_track_name = sp.math_track_name) AND
      (cc.capstone_option_name IS NULL OR cc.capstone_option_name = sp.capstone_option_name)
    )
  JOIN courses c ON c.code = cc.course_code
  WHERE cc.is_required = true
),
-- All elective CTEs updated with NULLs for new fields
major_electives AS (
  SELECT
    si.student_id,
\tsi.auth_id,
    NULL::TEXT AS course_code,
    'MAJOR' AS parent_category,
    'Major Electives' AS category_name,
     Null AS sub_category,
    'Major Elective ' || row_number() OVER (
      PARTITION BY si.student_id
      ORDER BY dr.min_courses
    ) AS course_title,
    1.0 AS credits,
    NULL::semester_offering[] AS offered_in_semesters,  -- Cast to enum array type
    NULL::INTEGER AS recommended_year,
    NULL::INTEGER AS recommended_semester,
    true AS is_required
  FROM student_info si
  JOIN degree_requirements dr
    ON si.major_code = dr.major_code
    AND dr.category_name = 'Major Electives'
  CROSS JOIN LATERAL (
    SELECT generate_series(1,
      CASE
        WHEN si.capstone_option_name = 'Applied Project' THEN dr.min_courses + 1
        ELSE dr.min_courses
      END
    )
  ) AS s(num)
),
non_major_electives AS (
  SELECT
    si.student_id,
\tsi.auth_id,
    NULL::TEXT AS course_code,
    'LIBERAL ARTS & SCIENCES CORE' AS parent_category,
    'Non-Major Electives' AS category_name,
    'Non-Major Electives' AS sub_category,
    'Non-Major Elective ' || row_number() OVER (
      PARTITION BY si.student_id
      ORDER BY dr.min_courses
    ) AS course_title,
    1.0 AS credits,
    NULL::semester_offering[] AS offered_in_semesters,
    NULL::INTEGER AS recommended_year,
    NULL::INTEGER AS recommended_semester,
    true AS is_required
  FROM student_info si
  JOIN (
    SELECT major_code, SUM(min_courses) AS min_courses
    FROM degree_requirements
    WHERE category_name = 'Non-Major Electives'
    GROUP BY major_code
  ) dr ON si.major_code = dr.major_code
  CROSS JOIN LATERAL (
    SELECT generate_series(1,
      GREATEST(
        dr.min_courses -
          CASE
            WHEN si.major_code = 'MIS' THEN 2
            ELSE 1
          END,
        0
      )
    )
  ) AS s(num)
),
africana_electives AS (
  SELECT
    si.student_id,
\tsi.auth_id,
    NULL::TEXT AS course_code,
    'LIBERAL ARTS & SCIENCES CORE' AS parent_category,
    'Non-Major Electives' AS category_name,
    'Africana' AS sub_category,
    'Africana 1' AS course_title,
    1.0 AS credits,
    NULL::semester_offering[] AS offered_in_semesters,
    NULL::INTEGER AS recommended_year,
    NULL::INTEGER AS recommended_semester,
    true AS is_required
  FROM student_info si
  JOIN (
    SELECT major_code, SUM(min_courses) AS min_courses
    FROM degree_requirements
    WHERE category_name = 'Non-Major Electives'
    GROUP BY major_code
  ) dr ON si.major_code = dr.major_code
  WHERE dr.min_courses >= 1
),
free_electives AS (
  SELECT
    si.student_id,
\tsi.auth_id,
    NULL::TEXT AS course_code,
    'LIBERAL ARTS & SCIENCES CORE' AS parent_category,
    'Non-Major Electives' AS category_name,
    'Free Elective' AS sub_category,
    'Free Elective 1' AS course_title,
    1.0 AS credits,
    NULL::semester_offering[] AS offered_in_semesters,
    NULL::INTEGER AS recommended_year,
    NULL::INTEGER AS recommended_semester,
    true AS is_required
  FROM student_info si
  JOIN (
    SELECT major_code, SUM(min_courses) AS min_courses
    FROM degree_requirements
    WHERE category_name = 'Non-Major Electives'
    GROUP BY major_code
  ) dr ON si.major_code = dr.major_code
  WHERE si.major_code = 'MIS' AND dr.min_courses >= 2
),
combined_required AS (
  SELECT * FROM required_courses_base
  UNION ALL
  SELECT * FROM major_electives
  UNION ALL
  SELECT * FROM non_major_electives
  UNION ALL
  SELECT * FROM africana_electives
  UNION ALL
  SELECT * FROM free_electives
)
SELECT
  cr.student_id,
  cr.auth_id,
  cr.parent_category,
  cr.category_name,
  cr.sub_category,
  cr.course_code,
  cr.course_title,
  cr.credits,
  cr.offered_in_semesters,  -- Included in final select
  cr.recommended_year,      -- Included in final select
  cr.recommended_semester,  -- Included in final select
  cr.is_required
FROM combined_required cr

`
);

export type StudentRequiredCoursesRecord = InferModelFromColumns<
  (typeof studentRequiredCoursesView)["_"]["selectedFields"]
>;
