import { sql, type SQL } from "drizzle-orm";

/**
 * Which day of a plan lands on a calendar date.
 *
 * A plan is written as (week, day) so it stays reusable --- the same programme
 * can start on any Monday. A calendar, though, asks the opposite question:
 * "what is prescribed on the 18th?". That answer only exists relative to an
 * assignment, because the assignment is what pins day 1 to a real date.
 *
 * Without this, every query that joined plan_days to an active assignment
 * returned EVERY day of the plan on EVERY date --- a four-day programme showed
 * all four days' work on all four days.
 *
 * The week wraps at the number of weeks the plan actually HAS days for, not at
 * its nominal durationWeeks. A coach who writes one week and assigns it for a
 * month means "this week, every week" --- the alternative is a plan that goes
 * silent on day 8. A block built from a date range is unaffected: its days
 * cover its whole window, so the wrap never comes round.
 *
 * Table names are written out literally: interpolating a drizzle column into a
 * raw sql`` template renders it UNQUALIFIED, which silently resolves against
 * the wrong table in a multi-table join.
 */
export function planDayMatchesDate(date: string): SQL {
  return sql`
    plan_days.day_number = ((${date}::date - plan_assignments.start_date)::int % 7) + 1
    AND plan_days.week_number = (
      ((${date}::date - plan_assignments.start_date)::int / 7)
      % (SELECT GREATEST(MAX(pd_span.week_number), 1) FROM plan_days pd_span WHERE pd_span.plan_id = plan_days.plan_id)
    ) + 1`;
}

/** The same mapping in JS, for building a plan from a date range. */
export function dayCoordsForOffset(offsetDays: number): { weekNumber: number; dayNumber: number } {
  return { weekNumber: Math.floor(offsetDays / 7) + 1, dayNumber: (offsetDays % 7) + 1 };
}

/** Whole days between two YYYY-MM-DD dates. UTC-anchored so DST cannot shift it. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00.000Z`);
  const b = Date.parse(`${to}T00:00:00.000Z`);
  return Math.round((b - a) / 86_400_000);
}
