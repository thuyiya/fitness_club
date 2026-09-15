import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { activityIntensity, healthSource, mealType } from "./enums.js";
import { activities } from "./reference.js";
import { users } from "./identity.js";
import { foods, meals } from "./nutrition.js";
import { exercises, planAssignments, planDays } from "./training.js";

/**
 * Every table here is append-oriented and indexed on (member_id, date) --- that
 * composite is what C04's "who trained today", C24's member logs and M12's charts
 * all read through.
 */

export const workoutLogs = pgTable(
  "workout_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id").references(() => planAssignments.id, { onDelete: "set null" }),
    planDayId: uuid("plan_day_id").references(() => planDays.id, { onDelete: "set null" }),
    date: date("date").notNull(),
    title: text("title"),
    /**
     * Set when the member quick-logged a bout ("played squash for an hour")
     * rather than completing a planned session. Mutually exclusive with
     * planDayId in practice; the calorie estimate comes from the activity MET.
     */
    activityId: uuid("activity_id").references(() => activities.id, { onDelete: "set null" }),
    intensity: activityIntensity("intensity"),
    durationMinutes: integer("duration_minutes"),
    caloriesBurned: integer("calories_burned"),
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("workout_logs_member_date_idx").on(t.memberId, t.date)],
);

/** Per-set actuals, so a coach can see what was really lifted vs prescribed. */
export const workoutLogSets = pgTable(
  "workout_log_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workoutLogId: uuid("workout_log_id")
      .notNull()
      .references(() => workoutLogs.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    setNumber: integer("set_number").notNull(),
    /**
     * Which of these is populated follows exercises.loggingMode. Before these
     * columns existed a plank, a farmer's walk and a front lever could all be
     * PRESCRIBED but none of them could be LOGGED.
     */
    reps: integer("reps"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    durationSeconds: integer("duration_seconds"),
    distanceMetres: numeric("distance_metres", { precision: 8, scale: 1 }),
    rounds: integer("rounds"),
    rpe: numeric("rpe", { precision: 3, scale: 1 }),
    completed: boolean("completed").notNull().default(true),
  },
  (t) => [index("workout_log_sets_log_idx").on(t.workoutLogId)],
);

/**
 * mealId is set when the member logged a composed meal; NULL when they logged
 * loose foods. Macros are snapshotted at log time so later edits to a food or
 * meal never rewrite history.
 */
export const mealLogs = pgTable(
  "meal_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mealId: uuid("meal_id").references(() => meals.id, { onDelete: "set null" }),
    date: date("date").notNull(),
    mealType: mealType("meal_type").notNull(),
    photoUrl: text("photo_url"),
    calories: numeric("calories", { precision: 8, scale: 2 }).notNull().default("0"),
    proteinG: numeric("protein_g", { precision: 8, scale: 2 }).notNull().default("0"),
    carbsG: numeric("carbs_g", { precision: 8, scale: 2 }).notNull().default("0"),
    fatG: numeric("fat_g", { precision: 8, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("meal_logs_member_date_idx").on(t.memberId, t.date)],
);

export const mealLogItems = pgTable(
  "meal_log_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mealLogId: uuid("meal_log_id")
      .notNull()
      .references(() => mealLogs.id, { onDelete: "cascade" }),
    foodId: uuid("food_id").references(() => foods.id, { onDelete: "set null" }),
    /** Kept even if the food row is deleted, so old logs still read correctly. */
    nameSnapshot: text("name_snapshot").notNull(),
    quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull(),
    unit: text("unit").notNull().default("g"),
    calories: numeric("calories", { precision: 8, scale: 2 }).notNull().default("0"),
    proteinG: numeric("protein_g", { precision: 8, scale: 2 }).notNull().default("0"),
    carbsG: numeric("carbs_g", { precision: 8, scale: 2 }).notNull().default("0"),
    fatG: numeric("fat_g", { precision: 8, scale: 2 }).notNull().default("0"),
  },
  (t) => [index("meal_log_items_log_idx").on(t.mealLogId)],
);

/** M21 hydration: one row per sip, summed per day. */
export const hydrationLogs = pgTable(
  "hydration_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    amountMl: integer("amount_ml").notNull(),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("hydration_logs_member_date_idx").on(t.memberId, t.date)],
);

/** Auto-generated target (weight x activity), overridable by the coach. */
export const hydrationGoals = pgTable(
  "hydration_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dailyTargetMl: integer("daily_target_ml").notNull().default(2500),
    autoCalculated: boolean("auto_calculated").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("hydration_goals_member_unique").on(t.memberId)],
);

export const bodyMetrics = pgTable(
  "body_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    bodyFatPct: numeric("body_fat_pct", { precision: 5, scale: 2 }),
    /** { chest, waist, hips, thigh, arm } in cm --- shape varies per coach. */
    measurements: jsonb("measurements"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("body_metrics_member_date_unique").on(t.memberId, t.date)],
);

export const progressPhotos = pgTable(
  "progress_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    url: text("url").notNull(),
    pose: text("pose"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("progress_photos_member_date_idx").on(t.memberId, t.date)],
);

/**
 * One row per (member, date, source). Apple Health and Google Fit both write here;
 * the unique constraint makes re-syncing the same day an upsert instead of a duplicate.
 */
export const healthSummaries = pgTable(
  "health_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    source: healthSource("source").notNull(),
    steps: integer("steps"),
    activeEnergyKcal: integer("active_energy_kcal"),
    exerciseMinutes: integer("exercise_minutes"),
    restingHeartRate: integer("resting_heart_rate"),
    sleepMinutes: integer("sleep_minutes"),
    distanceMeters: integer("distance_meters"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("health_summaries_unique").on(t.memberId, t.date, t.source),
    index("health_summaries_member_date_idx").on(t.memberId, t.date),
  ],
);
