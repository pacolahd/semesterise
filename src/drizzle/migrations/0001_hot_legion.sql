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
CREATE TABLE "student_capstone_selections" (
	"student_id" varchar(20) PRIMARY KEY NOT NULL,
	"capstone_option_id" uuid NOT NULL,
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
ALTER TABLE "capstone_options" ADD COLUMN "first_semester_code" varchar(20);--> statement-breakpoint
ALTER TABLE "capstone_options" ADD COLUMN "second_semester_code" varchar(20);--> statement-breakpoint
ALTER TABLE "capstone_options" ADD COLUMN "requires_extra_elective" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "placeholder_courses" ADD CONSTRAINT "placeholder_courses_category_name_course_categories_name_fk" FOREIGN KEY ("category_name") REFERENCES "public"."course_categories"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_capstone_selections" ADD CONSTRAINT "student_capstone_selections_student_id_student_profiles_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_capstone_selections" ADD CONSTRAINT "student_capstone_selections_capstone_option_id_capstone_options_id_fk" FOREIGN KEY ("capstone_option_id") REFERENCES "public"."capstone_options"("id") ON DELETE no action ON UPDATE no action;