ALTER TABLE "plan_exercises" ALTER COLUMN "exercise_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_exercises" ADD COLUMN "activity_id" uuid;--> statement-breakpoint
ALTER TABLE "plan_exercises" ADD COLUMN "intensity" "activity_intensity";--> statement-breakpoint
ALTER TABLE "plan_exercises" ADD CONSTRAINT "plan_exercises_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- A prescribed item is an exercise (logged as sets) or an activity (logged as
-- a bout), never both and never neither.
ALTER TABLE "plan_exercises" ADD CONSTRAINT "plan_exercises_one_subject" CHECK (("exercise_id" IS NOT NULL) <> ("activity_id" IS NOT NULL));
