CREATE TYPE "public"."course_status" AS ENUM('active', 'archived', 'development');--> statement-breakpoint
CREATE TYPE "public"."semester_offering" AS ENUM('fall', 'spring', 'summer');--> statement-breakpoint
CREATE TYPE "public"."student_course_status" AS ENUM('verified', 'enrolled', 'planned', 'retake_required', 'dropped', 'failed');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('pending', 'processing', 'success', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."processing_step" AS ENUM('extraction', 'mapping', 'validation', 'categorization');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('pending', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."participant_role" AS ENUM('student', 'academic_advisor', 'hod', 'provost', 'registry', 'invited_approver', 'observer');--> statement-breakpoint
CREATE TYPE "public"."petition_status" AS ENUM('draft', 'submitted', 'advisor_approved', 'advisor_rejected', 'hod_approved', 'hod_rejected', 'provost_approved', 'provost_rejected', 'registry_processing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "departments" (
	"code" varchar(10) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "majors" (
	"department_code" varchar NOT NULL,
	"code" varchar(10) PRIMARY KEY NOT NULL,
	"degree" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_semesters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_name" varchar NOT NULL,
	"name" varchar(50) NOT NULL,
	"sequence_number" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_semesters_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "academic_years" (
	"year_name" varchar(20) PRIMARY KEY NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capstone_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capstone_options_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "grade_types" (
	"grade" varchar(5) PRIMARY KEY NOT NULL,
	"numeric_value" numeric(3, 2) NOT NULL,
	"description" text,
	"is_passing" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "math_tracks" (
	"name" varchar(50) PRIMARY KEY NOT NULL,
	"description" text,
	"required_courses_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_categories" (
	"name" varchar(100) PRIMARY KEY NOT NULL,
	"parent_category_name" varchar,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_categorization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_code" varchar NOT NULL,
	"category_name" varchar NOT NULL,
	"major_group" varchar(20),
	"math_track_name" varchar,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_flexible" boolean DEFAULT false NOT NULL,
	"recommended_year" integer,
	"recommended_semester" integer,
	"applicable_from_cohort_year" integer,
	"applicable_until_cohort_year" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_grade_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"major_code" varchar NOT NULL,
	"course_code" varchar NOT NULL,
	"minimum_grade" varchar(2) NOT NULL,
	"applicable_from_cohort_year" integer,
	"applicable_until_cohort_year" integer,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"department_code" varchar NOT NULL,
	"code" varchar(20) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"credits" numeric(3, 1) NOT NULL,
	"level" integer NOT NULL,
	"prerequisite_text" text,
	"status" "course_status" DEFAULT 'active' NOT NULL,
	"counts_for_gpa" boolean DEFAULT true NOT NULL,
	"offered_in_semesters" "semester_offering"[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_code_unique" UNIQUE("code"),
	CONSTRAINT "courses_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "degree_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"major_code" varchar NOT NULL,
	"category_name" varchar NOT NULL,
	"min_credits" numeric(4, 1) NOT NULL,
	"max_credits" numeric(4, 1),
	"min_courses" integer,
	"max_courses" integer,
	"applicable_from_cohort_year" integer,
	"applicable_until_cohort_year" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prerequisite_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_key" varchar(100) NOT NULL,
	"prerequisite_course_code" varchar(20) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prerequisite_groups" (
	"group_key" varchar(100) PRIMARY KEY NOT NULL,
	"course_code" varchar(20) NOT NULL,
	"group_name" varchar(100) NOT NULL,
	"description" text,
	"external_logic_operator" varchar(10) DEFAULT 'AND' NOT NULL,
	"internal_logic_operator" varchar(10) DEFAULT 'OR' NOT NULL,
	"is_concurrent" boolean DEFAULT false NOT NULL,
	"is_recommended" boolean DEFAULT false NOT NULL,
	"group_minimum_grade" varchar(2),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"non_course_requirement" text,
	"cohort_year_start" integer,
	"cohort_year_end" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_warnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(20) NOT NULL,
	"warning_type" varchar(50) NOT NULL,
	"course_code" varchar(20),
	"semester_id" uuid,
	"category_name" varchar,
	"severity" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"recommendation" text,
	"is_resolved" boolean DEFAULT false,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(20) NOT NULL,
	"course_code" varchar(20) NOT NULL,
	"semester_id" uuid NOT NULL,
	"status" "student_course_status" NOT NULL,
	"grade" varchar(5),
	"category_name" varchar,
	"original_category_name" varchar,
	"is_verified" boolean DEFAULT false,
	"counts_for_gpa" boolean DEFAULT true,
	"is_used_for_requirement" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"student_id" varchar(20) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"major_code" varchar NOT NULL,
	"math_track_name" varchar,
	"entry_year" integer NOT NULL,
	"cohort_year" integer NOT NULL,
	"current_year" integer NOT NULL,
	"current_semester" varchar(20) NOT NULL,
	"expected_graduation_date" date,
	"cumulative_gpa" numeric(3, 2),
	"total_credits_earned" numeric(5, 1) DEFAULT '0',
	"capstone_option_id" varchar,
	"is_active" boolean DEFAULT true,
	"onboarding_completed" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "student_profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "student_semester_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar(20) NOT NULL,
	"academic_semester_id" uuid NOT NULL,
	"program_year" integer,
	"program_semester" integer,
	"is_summer" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" varchar NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" varchar(255) NOT NULL,
	"import_date" timestamp with time zone DEFAULT now() NOT NULL,
	"import_status" "import_status" NOT NULL,
	"processed_courses_count" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_processing_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"step_name" "processing_step" NOT NULL,
	"status" "step_status" NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petition_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"petition_id" uuid NOT NULL,
	"course_code" varchar(20) NOT NULL,
	"action" varchar(50) NOT NULL,
	"reason" text,
	"current_grade" varchar(5),
	"target_semester_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petition_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"petition_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"document_url" varchar(255) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"uploaded_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petition_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"petition_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"is_admin_only" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petition_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"petition_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" "participant_role" NOT NULL,
	"is_notified" boolean DEFAULT false,
	"added_by" varchar(255),
	"last_viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petition_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"requires_parent_signature" boolean DEFAULT true,
	"requires_lecturer_signature" boolean DEFAULT false,
	"requires_academic_plan" boolean DEFAULT true,
	"custom_fields" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "petition_types_code_unique" UNIQUE("code"),
	CONSTRAINT "petition_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "petition_workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"petition_id" uuid NOT NULL,
	"role" "participant_role" NOT NULL,
	"order_index" integer NOT NULL,
	"is_mandatory" boolean DEFAULT true,
	"is_current" boolean DEFAULT false,
	"status" varchar(20),
	"action_user_id" varchar(255),
	"action_date" timestamp with time zone,
	"comments" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" varchar(20) NOT NULL,
	"student_id" varchar(20) NOT NULL,
	"petition_type_id" uuid NOT NULL,
	"semester_id" uuid NOT NULL,
	"status" "petition_status" DEFAULT 'draft' NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"academic_plan_included" boolean DEFAULT false,
	"primary_department_id" varchar NOT NULL,
	"secondary_department_id" varchar,
	"signed_document_url" varchar(255),
	"custom_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "petitions_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
ALTER TABLE "majors" ADD CONSTRAINT "majors_department_code_departments_code_fk" FOREIGN KEY ("department_code") REFERENCES "public"."departments"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_semesters" ADD CONSTRAINT "academic_semesters_academic_year_name_academic_years_year_name_fk" FOREIGN KEY ("academic_year_name") REFERENCES "public"."academic_years"("year_name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_categorization" ADD CONSTRAINT "course_categorization_course_code_courses_code_fk" FOREIGN KEY ("course_code") REFERENCES "public"."courses"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_categorization" ADD CONSTRAINT "course_categorization_category_name_course_categories_name_fk" FOREIGN KEY ("category_name") REFERENCES "public"."course_categories"("name") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_categorization" ADD CONSTRAINT "course_categorization_math_track_name_math_tracks_name_fk" FOREIGN KEY ("math_track_name") REFERENCES "public"."math_tracks"("name") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_grade_requirements" ADD CONSTRAINT "course_grade_requirements_major_code_majors_code_fk" FOREIGN KEY ("major_code") REFERENCES "public"."majors"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_grade_requirements" ADD CONSTRAINT "course_grade_requirements_course_code_courses_code_fk" FOREIGN KEY ("course_code") REFERENCES "public"."courses"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_department_code_departments_code_fk" FOREIGN KEY ("department_code") REFERENCES "public"."departments"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "degree_requirements" ADD CONSTRAINT "degree_requirements_major_code_majors_code_fk" FOREIGN KEY ("major_code") REFERENCES "public"."majors"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "degree_requirements" ADD CONSTRAINT "degree_requirements_category_name_course_categories_name_fk" FOREIGN KEY ("category_name") REFERENCES "public"."course_categories"("name") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prerequisite_courses" ADD CONSTRAINT "prerequisite_courses_group_key_prerequisite_groups_group_key_fk" FOREIGN KEY ("group_key") REFERENCES "public"."prerequisite_groups"("group_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prerequisite_courses" ADD CONSTRAINT "prerequisite_courses_prerequisite_course_code_courses_code_fk" FOREIGN KEY ("prerequisite_course_code") REFERENCES "public"."courses"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prerequisite_groups" ADD CONSTRAINT "prerequisite_groups_course_code_courses_code_fk" FOREIGN KEY ("course_code") REFERENCES "public"."courses"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_warnings" ADD CONSTRAINT "academic_warnings_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_warnings" ADD CONSTRAINT "academic_warnings_course_code_courses_code_fk" FOREIGN KEY ("course_code") REFERENCES "public"."courses"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_warnings" ADD CONSTRAINT "academic_warnings_semester_id_academic_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."academic_semesters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_warnings" ADD CONSTRAINT "academic_warnings_category_name_course_categories_name_fk" FOREIGN KEY ("category_name") REFERENCES "public"."course_categories"("name") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_courses" ADD CONSTRAINT "student_courses_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_courses" ADD CONSTRAINT "student_courses_course_code_courses_code_fk" FOREIGN KEY ("course_code") REFERENCES "public"."courses"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_courses" ADD CONSTRAINT "student_courses_semester_id_academic_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."academic_semesters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_courses" ADD CONSTRAINT "student_courses_grade_grade_types_grade_fk" FOREIGN KEY ("grade") REFERENCES "public"."grade_types"("grade") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_courses" ADD CONSTRAINT "student_courses_category_name_course_categories_name_fk" FOREIGN KEY ("category_name") REFERENCES "public"."course_categories"("name") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_courses" ADD CONSTRAINT "student_courses_original_category_name_course_categories_name_fk" FOREIGN KEY ("original_category_name") REFERENCES "public"."course_categories"("name") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_major_code_majors_code_fk" FOREIGN KEY ("major_code") REFERENCES "public"."majors"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_math_track_name_math_tracks_name_fk" FOREIGN KEY ("math_track_name") REFERENCES "public"."math_tracks"("name") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_capstone_option_id_capstone_options_name_fk" FOREIGN KEY ("capstone_option_id") REFERENCES "public"."capstone_options"("name") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_semester_mappings" ADD CONSTRAINT "student_semester_mappings_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_semester_mappings" ADD CONSTRAINT "student_semester_mappings_academic_semester_id_academic_semesters_id_fk" FOREIGN KEY ("academic_semester_id") REFERENCES "public"."academic_semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_imports" ADD CONSTRAINT "transcript_imports_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_processing_steps" ADD CONSTRAINT "transcript_processing_steps_import_id_transcript_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."transcript_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petition_courses" ADD CONSTRAINT "petition_courses_petition_id_petitions_id_fk" FOREIGN KEY ("petition_id") REFERENCES "public"."petitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petition_courses" ADD CONSTRAINT "petition_courses_course_code_courses_code_fk" FOREIGN KEY ("course_code") REFERENCES "public"."courses"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petition_courses" ADD CONSTRAINT "petition_courses_target_semester_id_academic_semesters_id_fk" FOREIGN KEY ("target_semester_id") REFERENCES "public"."academic_semesters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petition_documents" ADD CONSTRAINT "petition_documents_petition_id_petitions_id_fk" FOREIGN KEY ("petition_id") REFERENCES "public"."petitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petition_messages" ADD CONSTRAINT "petition_messages_petition_id_petitions_id_fk" FOREIGN KEY ("petition_id") REFERENCES "public"."petitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petition_participants" ADD CONSTRAINT "petition_participants_petition_id_petitions_id_fk" FOREIGN KEY ("petition_id") REFERENCES "public"."petitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petition_workflow_steps" ADD CONSTRAINT "petition_workflow_steps_petition_id_petitions_id_fk" FOREIGN KEY ("petition_id") REFERENCES "public"."petitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petitions" ADD CONSTRAINT "petitions_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petitions" ADD CONSTRAINT "petitions_petition_type_id_petition_types_id_fk" FOREIGN KEY ("petition_type_id") REFERENCES "public"."petition_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petitions" ADD CONSTRAINT "petitions_semester_id_academic_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."academic_semesters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petitions" ADD CONSTRAINT "petitions_primary_department_id_departments_code_fk" FOREIGN KEY ("primary_department_id") REFERENCES "public"."departments"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petitions" ADD CONSTRAINT "petitions_secondary_department_id_departments_code_fk" FOREIGN KEY ("secondary_department_id") REFERENCES "public"."departments"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_student_courses_student_semester" ON "student_courses" USING btree ("student_id","semester_id" DESC NULLS LAST) WITH (fillfactor=90);--> statement-breakpoint
CREATE INDEX "idx_student_courses_category" ON "student_courses" USING btree ("category_name") WHERE "student_courses"."category_name" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_student_courses_status" ON "student_courses" USING btree ("status") WHERE "student_courses"."status" <> 'dropped';--> statement-breakpoint
CREATE VIEW "public"."category_progress_view" AS (
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
  );--> statement-breakpoint
CREATE VIEW "public"."semester_credit_summaries_view" AS (
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
    GROUP BY sc.student_id, sc.semester_id
  );--> statement-breakpoint
CREATE VIEW "public"."student_graduation_progress_view" AS (
    SELECT
      cp.student_id,
      CURRENT_TIMESTAMP AS last_audit_date,
      
      -- Overall progress percentage
      CASE 
        WHEN SUM(cp.credits_required) > 0 
        THEN (SUM(cp.credits_completed) / SUM(cp.credits_required)) * 100
        ELSE 0
      END AS overall_progress_percentage,
      
      -- Credit totals
      SUM(cp.credits_completed) AS credits_completed,
      GREATEST(SUM(cp.credits_required) - SUM(cp.credits_completed), 0) AS credits_remaining,
      
      -- Requirement counts
      COUNT(CASE WHEN cp.progress_percentage >= 100 THEN 1 ELSE NULL END) AS requirements_completed,
      COUNT(CASE WHEN cp.progress_percentage < 100 THEN 1 ELSE NULL END) AS requirements_remaining,
      
      -- On track flag
      CASE 
        WHEN COUNT(CASE WHEN cp.progress_percentage < 100 THEN 1 ELSE NULL END) = 0 THEN true
        WHEN (SUM(cp.credits_completed) / NULLIF(SUM(cp.credits_required), 0)) >= 0.8 THEN true
        ELSE false
      END AS on_track_for_graduation,
      
      -- Graduate date estimation (simplified)
      (
        SELECT sp.expected_graduation_date 
        FROM student_profiles sp 
        WHERE sp.student_id = cp.student_id
      ) AS projected_graduation_date
    FROM category_progress_view cp
    GROUP BY cp.student_id
  );