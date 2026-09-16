ALTER TABLE "meal_log_items" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD COLUMN "ended_at" timestamp with time zone;