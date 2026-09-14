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
import { assignmentStatus, mealType, planStatus, planType, recurrence } from "./enums";
import { gyms, teams } from "./gyms";
import { users } from "./identity";
import { meals } from "./nutrition";

/**
 * Exercise library. ownerCoachId NULL means it is a global/seed exercise;
 * non-null means a coach or member created it (C10 picker, M19 custom exercise).
 */
export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerCoachId: uuid("owner_coach_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    muscleGroups: text("muscle_groups").array().notNull().default([]),
    equipment: text("equipment").array().notNull().default([]),
    difficulty: text("difficulty"),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    instructions: text("instructions").array().notNull().default([]),
    isCustom: boolean("is_custom").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("exercises_owner_idx").on(t.ownerCoachId),
    index("exercises_name_idx").on(t.name),
  ],
);

/**
 * A plan is both a workout plan and a meal plan (discriminated by `type`).
 * isTemplate marks the reusable library entries behind C14 "Plan templates".
 */
export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerCoachId: uuid("owner_coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "set null" }),
    type: planType("type").notNull(),
    name: text("name").notNull(),
    goal: text("goal"),
    difficulty: text("difficulty"),
    durationWeeks: integer("duration_weeks").notNull().default(1),
    status: planStatus("status").notNull().default("draft"),
    isTemplate: boolean("is_template").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("plans_owner_idx").on(t.ownerCoachId),
    index("plans_gym_type_idx").on(t.gymId, t.type),
  ],
);

/** One row per (week, day) --- the C11 workout-day editor operates on this. */
export const planDays = pgTable(
  "plan_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull().default(1),
    dayNumber: integer("day_number").notNull(),
    title: text("title"),
    isRestDay: boolean("is_rest_day").notNull().default(false),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("plan_days_unique").on(t.planId, t.weekNumber, t.dayNumber)],
);

export const planExercises = pgTable(
  "plan_exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planDayId: uuid("plan_day_id")
      .notNull()
      .references(() => planDays.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
    sets: integer("sets"),
    reps: integer("reps"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    restSeconds: integer("rest_seconds"),
    durationSeconds: integer("duration_seconds"),
    notes: text("notes"),
  },
  (t) => [index("plan_exercises_day_idx").on(t.planDayId, t.position)],
);

/** Meal plans reference composed meals (C13 meal editor). */
export const planMeals = pgTable(
  "plan_meals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planDayId: uuid("plan_day_id")
      .notNull()
      .references(() => planDays.id, { onDelete: "cascade" }),
    mealId: uuid("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "restrict" }),
    mealType: mealType("meal_type").notNull(),
    position: integer("position").notNull().default(0),
    servings: numeric("servings", { precision: 5, scale: 2 }).notNull().default("1"),
    notes: text("notes"),
  },
  (t) => [index("plan_meals_day_idx").on(t.planDayId, t.position)],
);

/**
 * C15 assign plan / C32 schedule. Exactly one of memberId or teamId is set ---
 * a team assignment fans out to its members at read time rather than duplicating rows.
 */
export const planAssignments = pgTable(
  "plan_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    repeats: recurrence("repeats").notNull().default("once"),
    status: assignmentStatus("status").notNull().default("scheduled"),
    /** Per-member tweaks on top of the shared plan, so the template stays clean. */
    customizations: jsonb("customizations"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("plan_assignments_member_date_idx").on(t.memberId, t.startDate),
    index("plan_assignments_team_idx").on(t.teamId),
    index("plan_assignments_plan_idx").on(t.planId),
  ],
);
