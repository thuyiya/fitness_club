CREATE TYPE "public"."promotion_kind" AS ENUM('intro_offer', 'discount', 'free_consultation', 'programme_launch', 'announcement');--> statement-breakpoint
CREATE TABLE "coach_profiles" (
	"coach_id" uuid PRIMARY KEY NOT NULL,
	"headline" text,
	"specialties" text[] DEFAULT '{}' NOT NULL,
	"certifications" text[] DEFAULT '{}' NOT NULL,
	"years_experience" integer,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"price_from_cents" integer,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"accepting_clients" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"kind" "promotion_kind" DEFAULT 'announcement' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"offer_text" text,
	"image_url" text,
	"starts_on" date,
	"ends_on" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_promotions" ADD CONSTRAINT "coach_promotions_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coach_promotions_coach_idx" ON "coach_promotions" USING btree ("coach_id","is_active");