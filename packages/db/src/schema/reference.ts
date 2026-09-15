/**
 * Platform reference tables: rows that are seeded, shared by every gym, and
 * owned by nobody. Kept in their own module because they depend on enums alone
 * --- identity.ts points at sportProfiles, so anything here importing users
 * back would create a cycle.
 */
import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { activityIntensity, activityKind, sportType } from "./enums.js";

/**
 * A bout logged by DURATION and INTENSITY rather than sets --- sports, and the
 * gym-session proxies that let an unplanned workout be logged in one tap.
 * Deliberately separate from `exercises`: the two are prescribed, logged and
 * progressed in completely different ways.
 */
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    kind: activityKind("kind").notNull().default("sport"),
    group: text("group").notNull(),
    /** kcal = met * 3.5 * weightKg / 200 * durationMinutes */
    met: numeric("met", { precision: 4, scale: 1 }).notNull(),
    intensity: activityIntensity("intensity").notNull(),
    indoor: boolean("indoor").notNull().default(false),
    tracksDistance: boolean("tracks_distance").notNull().default(false),
    /** Lets an Apple Health / Google Fit import map onto the same row. */
    healthKitType: text("health_kit_type"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("activities_slug_unique").on(t.slug),
    index("activities_kind_idx").on(t.kind, t.group),
    index("activities_health_idx").on(t.healthKitType),
  ],
);

/**
 * A member's sport of focus, which sets carbohydrate and protein targets in
 * g/kg. This is a property of the MEMBER, not of anything they logged: a
 * cricketer eats to a cricket profile on the morning they went cycling.
 */
export const sportProfiles = pgTable(
  "sport_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    type: sportType("type").notNull(),
    carbsLose: numeric("carbs_lose", { precision: 4, scale: 1 }).notNull(),
    carbsMaintain: numeric("carbs_maintain", { precision: 4, scale: 1 }).notNull(),
    carbsGain: numeric("carbs_gain", { precision: 4, scale: 1 }).notNull(),
    proteinLose: numeric("protein_lose", { precision: 4, scale: 2 }).notNull(),
    proteinMaintain: numeric("protein_maintain", { precision: 4, scale: 2 }).notNull(),
    proteinGain: numeric("protein_gain", { precision: 4, scale: 2 }).notNull(),
  },
  (t) => [uniqueIndex("sport_profiles_slug_unique").on(t.slug)],
);

/**
 * A plan is both a workout plan and a meal plan (discriminated by `type`).
 * isTemplate marks the reusable library entries behind C14 "Plan templates".
 */
