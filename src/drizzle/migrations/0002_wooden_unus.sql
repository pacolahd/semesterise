ALTER TYPE "public"."error_severity" ADD VALUE 'high';--> statement-breakpoint
ALTER TYPE "public"."error_severity" ADD VALUE 'low';--> statement-breakpoint
ALTER TYPE "public"."error_severity" ADD VALUE 'medium';--> statement-breakpoint
ALTER TABLE "error_logs" ALTER COLUMN "activity_id" DROP NOT NULL;