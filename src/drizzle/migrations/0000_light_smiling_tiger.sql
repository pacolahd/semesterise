CREATE TYPE "public"."course_status" AS ENUM('active', 'archived', 'development');--> statement-breakpoint
CREATE TYPE "public"."major_group" AS ENUM('ALL', 'CS', 'NON-ENG', 'MIS', 'BA', 'ENG', 'CE', 'EE', 'ME');--> statement-breakpoint
CREATE TYPE "public"."semester_offering" AS ENUM('fall', 'spring', 'summer');--> statement-breakpoint
CREATE TYPE "public"."student_course_status" AS ENUM('verified', 'enrolled', 'planned', 'retake_required', 'imported', 'dropped', 'failed');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('pending', 'processing', 'extracting', 'mapping', 'verifying', 'importing', 'success', 'partial', 'failed', 'cancelled', 'awaiting_verification');--> statement-breakpoint
CREATE TYPE "public"."processing_step" AS ENUM('file_validation', 'extraction', 'student_identification', 'semester_mapping', 'course_validation', 'categorization', 'grade_analysis', 'requirements_mapping', 'database_integration', 'verification', 'completion');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('pending', 'in_progress', 'completed', 'failed', 'warning', 'skipped', 'awaiting_user_input');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('not_required', 'pending', 'approved', 'rejected', 'modified');--> statement-breakpoint
CREATE TYPE "public"."participant_role" AS ENUM('student', 'academic_advisor', 'hod', 'provost', 'registry', 'invited_approver', 'observer');--> statement-breakpoint
CREATE TYPE "public"."petition_status" AS ENUM('draft', 'submitted', 'advisor_approved', 'advisor_rejected', 'hod_approved', 'hod_rejected', 'provost_approved', 'provost_rejected', 'registry_processing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('academic_advisor', 'hod', 'provost', 'registry', 'lecturer', 'student');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('student', 'staff');--> statement-breakpoint
CREATE TYPE "public"."user_activity_status" AS ENUM('started', 'succeeded', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."error_severity" AS ENUM('info', 'warning', 'error', 'critical', 'high', 'low', 'medium');--> statement-breakpoint
CREATE TYPE "public"."error_source" AS ENUM('client', 'server', 'database', 'api', 'auth', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."error_status" AS ENUM('unhandled', 'handled', 'suppressed', 'critical');--> statement-breakpoint
CREATE TABLE "department_heads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_code" varchar NOT NULL,
	"staff_id" varchar NOT NULL,
	"start_date" date,
	"end_date" date,
	"is_current" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "staff_email_roles" (
	"email" varchar(100) PRIMARY KEY NOT NULL,
	"role" varchar(50) NOT NULL,
	"department_code" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"staff_id" varchar(20),
	"auth_id" uuid PRIMARY KEY NOT NULL,
	"department_code" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_profiles_staff_id_unique" UNIQUE("staff_id")
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
	"first_semester_code" varchar(20),
	"second_semester_code" varchar(20),
	"requires_extra_elective" boolean DEFAULT false,
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
	"capstone_option_name" varchar,
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
CREATE TABLE "placeholder_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"title" varchar(255) NOT NULL,
	"category_name" varchar(100) NOT NULL,
	"credits" numeric(3, 1) NOT NULL,
	"description" text,
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
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"student_id" varchar(20),
	"auth_id" uuid PRIMARY KEY NOT NULL,
	"major_code" varchar,
	"math_track_name" varchar,
	"entry_year" integer,
	"cohort_year" integer,
	"current_year" integer,
	"current_semester" varchar(20),
	"expected_graduation_date" date,
	"cumulative_gpa" numeric(3, 2),
	"total_credits_earned" numeric(5, 1) DEFAULT '0',
	"capstone_option_name" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_student_id_unique" UNIQUE("student_id")
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
	"student_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"extracted_major" text,
	"import_status" "import_status" DEFAULT 'pending' NOT NULL,
	"verification_status" "verification_status" DEFAULT 'not_required' NOT NULL,
	"requires_verification" boolean DEFAULT false NOT NULL,
	"semester_count" integer,
	"processed_courses_count" integer,
	"successfully_imported_count" integer,
	"failed_count" integer,
	"import_data" jsonb,
	"new_semesters_count" integer DEFAULT 0,
	"updated_semesters_count" integer DEFAULT 0,
	"new_courses_count" integer DEFAULT 0,
	"updated_courses_count" integer DEFAULT 0,
	"is_update" boolean DEFAULT false,
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
CREATE TABLE "transcript_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"verification_token" varchar(100) NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"original_mappings" jsonb,
	"updated_mappings" jsonb,
	"user_notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "system_configurations" (
	"key" varchar(50) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "department_heads" ADD CONSTRAINT "department_heads_department_code_departments_code_fk" FOREIGN KEY ("department_code") REFERENCES "public"."departments"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_heads" ADD CONSTRAINT "department_heads_staff_id_staff_profiles_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_profiles"("staff_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "majors" ADD CONSTRAINT "majors_department_code_departments_code_fk" FOREIGN KEY ("department_code") REFERENCES "public"."departments"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_email_roles" ADD CONSTRAINT "staff_email_roles_department_code_departments_code_fk" FOREIGN KEY ("department_code") REFERENCES "public"."departments"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_auth_id_user_id_fk" FOREIGN KEY ("auth_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_department_code_departments_code_fk" FOREIGN KEY ("department_code") REFERENCES "public"."departments"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_semesters" ADD CONSTRAINT "academic_semesters_academic_year_name_academic_years_year_name_fk" FOREIGN KEY ("academic_year_name") REFERENCES "public"."academic_years"("year_name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_categorization" ADD CONSTRAINT "course_categorization_course_code_courses_code_fk" FOREIGN KEY ("course_code") REFERENCES "public"."courses"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_categorization" ADD CONSTRAINT "course_categorization_category_name_course_categories_name_fk" FOREIGN KEY ("category_name") REFERENCES "public"."course_categories"("name") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_categorization" ADD CONSTRAINT "course_categorization_math_track_name_math_tracks_name_fk" FOREIGN KEY ("math_track_name") REFERENCES "public"."math_tracks"("name") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_categorization" ADD CONSTRAINT "course_categorization_capstone_option_name_capstone_options_name_fk" FOREIGN KEY ("capstone_option_name") REFERENCES "public"."capstone_options"("name") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_grade_requirements" ADD CONSTRAINT "course_grade_requirements_major_code_majors_code_fk" FOREIGN KEY ("major_code") REFERENCES "public"."majors"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_grade_requirements" ADD CONSTRAINT "course_grade_requirements_course_code_courses_code_fk" FOREIGN KEY ("course_code") REFERENCES "public"."courses"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_department_code_departments_code_fk" FOREIGN KEY ("department_code") REFERENCES "public"."departments"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "degree_requirements" ADD CONSTRAINT "degree_requirements_major_code_majors_code_fk" FOREIGN KEY ("major_code") REFERENCES "public"."majors"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "degree_requirements" ADD CONSTRAINT "degree_requirements_category_name_course_categories_name_fk" FOREIGN KEY ("category_name") REFERENCES "public"."course_categories"("name") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placeholder_courses" ADD CONSTRAINT "placeholder_courses_category_name_course_categories_name_fk" FOREIGN KEY ("category_name") REFERENCES "public"."course_categories"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_auth_id_user_id_fk" FOREIGN KEY ("auth_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_major_code_majors_code_fk" FOREIGN KEY ("major_code") REFERENCES "public"."majors"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_math_track_name_math_tracks_name_fk" FOREIGN KEY ("math_track_name") REFERENCES "public"."math_tracks"("name") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_capstone_option_name_capstone_options_name_fk" FOREIGN KEY ("capstone_option_name") REFERENCES "public"."capstone_options"("name") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_semester_mappings" ADD CONSTRAINT "student_semester_mappings_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_semester_mappings" ADD CONSTRAINT "student_semester_mappings_academic_semester_id_academic_semesters_id_fk" FOREIGN KEY ("academic_semester_id") REFERENCES "public"."academic_semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_processing_steps" ADD CONSTRAINT "transcript_processing_steps_import_id_transcript_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."transcript_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_verifications" ADD CONSTRAINT "transcript_verifications_import_id_transcript_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."transcript_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_student_courses_student_semester" ON "student_courses" USING btree ("student_id","semester_id" DESC NULLS LAST) WITH (fillfactor=90);--> statement-breakpoint
CREATE INDEX "idx_student_courses_category" ON "student_courses" USING btree ("category_name") WHERE "student_courses"."category_name" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_student_courses_status" ON "student_courses" USING btree ("status") WHERE "student_courses"."status" <> 'dropped';--> statement-breakpoint
CREATE VIEW "public"."student_course_status_view" AS (
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
);--> statement-breakpoint
CREATE VIEW "public"."student_required_courses_view" AS (
WITH student_info AS (
  SELECT
    student_id, major_code, cohort_year,
    math_track_name, capstone_option_name
  FROM student_profiles
),
required_courses_base AS (
  SELECT
    sp.student_id,
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
    NULL::TEXT AS course_code,
    'MAJOR' AS parent_category,
    'Major Electives' AS category_name,
    'Major Electives' AS sub_category,
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
);--> statement-breakpoint
CREATE VIEW "public"."student_degree_requirement_progress_view" AS (
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
  );
