import {
  boolean,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { goalPeriod, goalSource, goalStatus } from "./enums.js";
import { users } from "./identity.js";

/**
 * M12 goals. `source` distinguishes a coach-assigned goal from one the member
 * set themselves --- that is the COACH JORDAN vs PERSONAL pill on the card.
 *
 * `metric` is the thing being counted (hydration_ml, workouts, steps, protein_g...)
 * so the evaluator is one generic job rather than a branch per goal type.
 */
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    source: goalSource("source").notNull(),
    title: text("title").notNull(),
    metric: text("metric").notNull(),
    targetValue: numeric("target_value", { precision: 10, scale: 2 }).notNull(),
    unit: text("unit"),
    period: goalPeriod("period").notNull().default("daily"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    status: goalStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("goals_member_status_idx").on(t.memberId, t.status)],
);

/**
 * One row per goal per period --- this is literally the dot graph on M12.
 * `achieved` is stored rather than derived so the history does not silently
 * change when a target is edited later.
 */
export const goalEntries = pgTable(
  "goal_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    value: numeric("value", { precision: 10, scale: 2 }).notNull().default("0"),
    achieved: boolean("achieved").notNull().default(false),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("goal_entries_unique").on(t.goalId, t.date)],
);
