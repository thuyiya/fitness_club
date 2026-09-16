/**
 * Scheduled time, as distinct from prescribed work.
 *
 * A plan assignment says "do this programme over these weeks"; an appointment
 * says "be here at 09:00 on Thursday". The coach calendar is built from these,
 * and they are the only rows that can collide, so they carry real timestamps
 * rather than a date plus a loose notion of when.
 */
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appointmentKind, appointmentStatus } from "./enums.js";
import { gyms } from "./gyms.js";
import { users } from "./identity.js";

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => users.id, { onDelete: "cascade" }),
    gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "set null" }),
    kind: appointmentKind("kind").notNull().default("training_session"),
    title: text("title").notNull(),
    notes: text("notes"),
    location: text("location"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatus("status").notNull().default("scheduled"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The coach day view scans a time window for one coach; the member view
    // does the same for one member. Both are the hot path for the calendar.
    index("appointments_coach_time_idx").on(t.coachId, t.startsAt),
    index("appointments_member_time_idx").on(t.memberId, t.startsAt),
    index("appointments_gym_idx").on(t.gymId),
  ],
);
