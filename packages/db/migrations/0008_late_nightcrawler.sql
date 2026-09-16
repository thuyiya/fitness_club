-- Gyms get their own lifecycle enum instead of borrowing user_status.
--
-- A gym is not "suspended" --- it is awaiting approval, live, turned down, or
-- retired. The default changes to 'pending' so a coach-created gym is not live
-- until an admin promotes it; gyms an admin creates are set active explicitly.
--
-- NOTE: everything else drizzle wanted to emit here (the USDA tables, columns
-- and the `usda` food_source value) already exists --- 0007 was applied outside
-- drizzle and has been baselined in __drizzle_migrations. The accompanying
-- 0008 snapshot IS correct, so future diffs will be clean.
CREATE TYPE "public"."gym_status" AS ENUM('pending', 'active', 'rejected', 'archived');
--> statement-breakpoint
ALTER TABLE "gyms" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "gyms" ALTER COLUMN "status" SET DATA TYPE "public"."gym_status" USING "status"::text::"public"."gym_status";
--> statement-breakpoint
ALTER TABLE "gyms" ALTER COLUMN "status" SET DEFAULT 'pending';
