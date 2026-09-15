-- Trigram search for the food/exercise name lookups, which are prefix-hostile
-- ("greek yogurt" should match "Yogurt, Greek, 0%").
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TYPE "public"."activity_intensity" AS ENUM('light', 'moderate', 'vigorous');
--> statement-breakpoint
CREATE TYPE "public"."activity_kind" AS ENUM('sport', 'training_session', 'daily_living');
--> statement-breakpoint
CREATE TYPE "public"."activity_level" AS ENUM('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active');
--> statement-breakpoint
CREATE TYPE "public"."biological_sex" AS ENUM('male', 'female');
--> statement-breakpoint
CREATE TYPE "public"."difficulty_level" AS ENUM('beginner', 'intermediate', 'advanced', 'elite');
--> statement-breakpoint
CREATE TYPE "public"."discipline" AS ENUM('calisthenics', 'gym', 'cardio', 'mobility');
--> statement-breakpoint
CREATE TYPE "public"."exercise_category" AS ENUM('strength', 'cardio', 'hiit', 'mobility', 'flexibility', 'plyometric', 'balance', 'core', 'warmup', 'cooldown');
--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('fat_loss', 'maintain', 'muscle_gain', 'recomposition', 'endurance', 'general_health');
--> statement-breakpoint
CREATE TYPE "public"."logging_mode" AS ENUM('reps', 'hold', 'distance', 'duration', 'rounds');
--> statement-breakpoint
CREATE TYPE "public"."movement_pattern" AS ENUM('horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'squat', 'hinge', 'lunge', 'carry', 'rotation', 'isolation', 'locomotion');
--> statement-breakpoint
CREATE TYPE "public"."sport_type" AS ENUM('endurance', 'power');
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "activity_kind" DEFAULT 'sport' NOT NULL,
	"group" text NOT NULL,
	"met" numeric(4, 1) NOT NULL,
	"intensity" "activity_intensity" NOT NULL,
	"indoor" boolean DEFAULT false NOT NULL,
	"tracks_distance" boolean DEFAULT false NOT NULL,
	"health_kit_type" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sport_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"type" "sport_type" NOT NULL,
	"carbs_lose" numeric(4, 1) NOT NULL,
	"carbs_maintain" numeric(4, 1) NOT NULL,
	"carbs_gain" numeric(4, 1) NOT NULL,
	"protein_lose" numeric(4, 2) NOT NULL,
	"protein_maintain" numeric(4, 2) NOT NULL,
	"protein_gain" numeric(4, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meals" ALTER COLUMN "owner_coach_id" DROP NOT NULL;
--> statement-breakpoint
-- USING is required to recast text into the enum; the column is empty at this point.
ALTER TABLE "exercises" ALTER COLUMN "difficulty" SET DATA TYPE difficulty_level USING "difficulty"::difficulty_level;
--> statement-breakpoint
ALTER TABLE "surveys" ALTER COLUMN "owner_coach_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sex" "biological_sex";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "activity_level" "activity_level";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "goal_type" "goal_type";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sport_profile_id" uuid;
--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "slug" text;
--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "group" text;
--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "allergens" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "food_classes" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "dietary_tags" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "slug" text;
--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "prep_minutes" integer;
--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "allergens" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "slug" text;
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "discipline" "discipline";
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "category" "exercise_category";
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "movement_pattern" "movement_pattern";
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "primary_muscle" text;
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "logging_mode" "logging_mode" DEFAULT 'reps' NOT NULL;
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "met" numeric(4, 1);
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "is_unilateral" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "is_compound" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "form_cues" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "common_mistakes" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "safety_notes" text;
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "regressions" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "progressions" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "workout_log_sets" ADD COLUMN "duration_seconds" integer;
--> statement-breakpoint
ALTER TABLE "workout_log_sets" ADD COLUMN "distance_metres" numeric(8, 1);
--> statement-breakpoint
ALTER TABLE "workout_log_sets" ADD COLUMN "rounds" integer;
--> statement-breakpoint
ALTER TABLE "workout_log_sets" ADD COLUMN "rpe" numeric(3, 1);
--> statement-breakpoint
ALTER TABLE "workout_logs" ADD COLUMN "activity_id" uuid;
--> statement-breakpoint
ALTER TABLE "workout_logs" ADD COLUMN "intensity" "activity_intensity";
--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "slug" text;
--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "is_template" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "activities_slug_unique" ON "activities" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "activities_kind_idx" ON "activities" USING btree ("kind","group");
--> statement-breakpoint
CREATE INDEX "activities_health_idx" ON "activities" USING btree ("health_kit_type");
--> statement-breakpoint
CREATE UNIQUE INDEX "sport_profiles_slug_unique" ON "sport_profiles" USING btree ("slug");
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_sport_profile_id_sport_profiles_id_fk" FOREIGN KEY ("sport_profile_id") REFERENCES "public"."sport_profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "foods_slug_unique" ON "foods" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "foods_group_idx" ON "foods" USING btree ("group");
--> statement-breakpoint
CREATE INDEX "foods_allergens_idx" ON "foods" USING gin ("allergens");
--> statement-breakpoint
CREATE INDEX "foods_dietary_idx" ON "foods" USING gin ("dietary_tags");
--> statement-breakpoint
CREATE UNIQUE INDEX "meals_slug_unique" ON "meals" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "meals_allergens_idx" ON "meals" USING gin ("allergens");
--> statement-breakpoint
CREATE INDEX "meals_tags_idx" ON "meals" USING gin ("tags");
--> statement-breakpoint
CREATE INDEX "meals_macro_idx" ON "meals" USING btree ("calories","protein_g");
--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_slug_unique" ON "exercises" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "exercises_browse_idx" ON "exercises" USING btree ("discipline","category","difficulty");
--> statement-breakpoint
CREATE INDEX "exercises_pattern_idx" ON "exercises" USING btree ("movement_pattern");
--> statement-breakpoint
-- Trigram indexes replace the plain btree on name noted as a TODO in the schema:
-- a btree only helps prefix matches, and nobody types a food name from the start.
CREATE INDEX "foods_name_trgm_idx" ON "foods" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "meals_name_trgm_idx" ON "meals" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "exercises_name_trgm_idx" ON "exercises" USING gin ("name" gin_trgm_ops);
