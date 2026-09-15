import { and, eq, inArray, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { coachRoster } from "../lib/access.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const coachRoutes: FastifyPluginAsync = async (app) => {
  const coachOnly = app.requireRole("coach", "admin");

  /**
   * The coach home screen in one request: who trained today, who has not, and
   * each member's day at a glance. Doing this per-member from the client would
   * be N round trips on a roster of any size.
   */
  app.get("/coach/today", { preHandler: coachOnly }, async (req) => {
    const { date } = z.object({ date: isoDate }).parse(req.query);
    const roster = await coachRoster(req.user!.id);
    if (roster.length === 0) return { date, members: [], completed: [], attention: [] };

    const ids = roster.map((m) => m.id);

    // Three grouped aggregates rather than correlated subqueries. Drizzle
    // renders column references UNQUALIFIED inside a raw sql`` template, so a
    // correlation like `WHERE member_id = id` silently resolves `id` to the
    // INNER table's own column and matches nothing --- no error, just zeros.
    // Grouping and joining in memory avoids the ambiguity entirely, and costs
    // three queries instead of three per member.
    const [workouts, meals, hydration] = await Promise.all([
      db
        .select({
          memberId: schema.workoutLogs.memberId,
          sessions: sql<number>`count(*) FILTER (WHERE ${schema.workoutLogs.completedAt} IS NOT NULL)::int`,
          minutes: sql<number>`coalesce(sum(${schema.workoutLogs.durationMinutes}), 0)::int`,
          kcalOut: sql<number>`coalesce(sum(${schema.workoutLogs.caloriesBurned}), 0)::int`,
          title: sql<string | null>`max(${schema.workoutLogs.title})`,
        })
        .from(schema.workoutLogs)
        .where(and(inArray(schema.workoutLogs.memberId, ids), eq(schema.workoutLogs.date, date)))
        .groupBy(schema.workoutLogs.memberId),
      db
        .select({
          memberId: schema.mealLogs.memberId,
          kcalIn: sql<number>`coalesce(sum(${schema.mealLogs.calories}), 0)::int`,
          proteinG: sql<number>`coalesce(sum(${schema.mealLogs.proteinG}), 0)::int`,
          logged: sql<number>`count(*)::int`,
        })
        .from(schema.mealLogs)
        .where(and(inArray(schema.mealLogs.memberId, ids), eq(schema.mealLogs.date, date)))
        .groupBy(schema.mealLogs.memberId),
      db
        .select({
          memberId: schema.hydrationLogs.memberId,
          ml: sql<number>`coalesce(sum(${schema.hydrationLogs.amountMl}), 0)::int`,
        })
        .from(schema.hydrationLogs)
        .where(and(inArray(schema.hydrationLogs.memberId, ids), eq(schema.hydrationLogs.date, date)))
        .groupBy(schema.hydrationLogs.memberId),
    ]);

    const w = new Map(workouts.map((r) => [r.memberId, r]));
    const m = new Map(meals.map((r) => [r.memberId, r]));
    const h = new Map(hydration.map((r) => [r.memberId, r]));

    const members = roster.map((row) => ({
      ...row,
      done: (w.get(row.id)?.sessions ?? 0) > 0,
      sessionTitle: w.get(row.id)?.title ?? null,
      minutes: w.get(row.id)?.minutes ?? 0,
      kcalOut: w.get(row.id)?.kcalOut ?? 0,
      kcalIn: m.get(row.id)?.kcalIn ?? 0,
      proteinG: m.get(row.id)?.proteinG ?? 0,
      mealsLogged: m.get(row.id)?.logged ?? 0,
      hydrationMl: h.get(row.id)?.ml ?? 0,
    }));

    return {
      date,
      members,
      completed: members.filter((x) => x.done).map((x) => x.id),
      attention: members.filter((x) => !x.done).map((x) => x.id),
    };
  });

  /**
   * Revenue by month, straight from payments. Amounts are integer cents; the
   * division happens once, here, so no client ever does float money maths.
   */
  app.get("/coach/revenue", { preHandler: coachOnly }, async (req) => {
    const { months } = z.object({ months: z.coerce.number().int().min(1).max(24).default(6) }).parse(req.query);

    const rows = await db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${schema.payments.paidAt}), 'YYYY-MM')`,
        cents: sql<number>`coalesce(sum(${schema.payments.amountCents}), 0)::bigint`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.payments)
      .where(and(eq(schema.payments.coachId, req.user!.id), eq(schema.payments.status, "paid")))
      .groupBy(sql`date_trunc('month', ${schema.payments.paidAt})`)
      .orderBy(sql`date_trunc('month', ${schema.payments.paidAt})`)
      .limit(months);

    const series = rows.map((r) => ({ month: r.month, amount: Number(r.cents) / 100, payments: r.count }));
    const current = series.at(-1)?.amount ?? 0;
    const previous = series.at(-2)?.amount ?? 0;
    return {
      series,
      current,
      changePct: previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null,
      activeMembers: (await coachRoster(req.user!.id)).length,
    };
  });
};
