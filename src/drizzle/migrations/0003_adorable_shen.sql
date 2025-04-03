CREATE TYPE "public"."error_status" AS ENUM('unhandled', 'handled', 'suppressed', 'critical');--> statement-breakpoint
ALTER TABLE "error_logs" ALTER COLUMN "code" SET DATA TYPE varchar;--> statement-breakpoint
DROP TYPE "public"."user_activity_status";--> statement-breakpoint
CREATE TYPE "public"."user_activity_status" AS ENUM('started', 'succeeded', 'failed', 'partial');