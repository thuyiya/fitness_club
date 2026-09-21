import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { assertCanReadMember, coachRoster } from "../lib/access.js";
import { notFound } from "../errors.js";

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
   * One member, everything a coach needs before a session: today's logs, the
   * week's trend, active goals and what is assigned. Built as one request
   * because a coach opens this between clients and will not wait for six.
   */
  app.get("/coach/members/:id", { preHandler: coachOnly }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { date } = z.object({ date: isoDate.optional() }).parse(req.query);
    await assertCanReadMember(req.user!, id);

    const day = date ?? new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(new Date(day).getTime() - 6 * 86400000).toISOString().slice(0, 10);

    const [member, latest, meals, workouts, hydration, goals, assignments, trend] = await Promise.all([
      db.query.users.findFirst({ where: eq(schema.users.id, id), columns: { passwordHash: false } }),
      db.query.bodyMetrics.findFirst({ where: eq(schema.bodyMetrics.memberId, id), orderBy: desc(schema.bodyMetrics.date) }),
      db
        .select({
          id: schema.mealLogs.id, mealType: schema.mealLogs.mealType, calories: schema.mealLogs.calories,
          proteinG: schema.mealLogs.proteinG, carbsG: schema.mealLogs.carbsG, fatG: schema.mealLogs.fatG,
          name: schema.meals.name,
        })
        .from(schema.mealLogs)
        .leftJoin(schema.meals, eq(schema.meals.id, schema.mealLogs.mealId))
        .where(and(eq(schema.mealLogs.memberId, id), eq(schema.mealLogs.date, day))),
      db
        .select({
          id: schema.workoutLogs.id, title: schema.workoutLogs.title,
          durationMinutes: schema.workoutLogs.durationMinutes, caloriesBurned: schema.workoutLogs.caloriesBurned,
        })
        .from(schema.workoutLogs)
        .where(and(eq(schema.workoutLogs.memberId, id), eq(schema.workoutLogs.date, day))),
      db
        .select({ ml: sql<number>`coalesce(sum(${schema.hydrationLogs.amountMl}), 0)::int` })
        .from(schema.hydrationLogs)
        .where(and(eq(schema.hydrationLogs.memberId, id), eq(schema.hydrationLogs.date, day))),
      db
        .select()
        .from(schema.goals)
        .where(and(eq(schema.goals.memberId, id), eq(schema.goals.status, "active"))),
      db
        .select({
          id: schema.planAssignments.id,
          startDate: schema.planAssignments.startDate,
          endDate: schema.planAssignments.endDate,
          repeats: schema.planAssignments.repeats,
          status: schema.planAssignments.status,
          planId: schema.plans.id,
          planName: schema.plans.name,
          planType: schema.plans.type,
          goal: schema.plans.goal,
          difficulty: schema.plans.difficulty,
          durationWeeks: schema.plans.durationWeeks,
          dayCount: sql<number>`(SELECT count(*)::int FROM plan_days pd WHERE pd.plan_id = plans.id)`,
        })
        .from(schema.planAssignments)
        .innerJoin(schema.plans, eq(schema.plans.id, schema.planAssignments.planId))
        .where(and(eq(schema.planAssignments.memberId, id), inArray(schema.planAssignments.status, ["scheduled", "active"])))
        .orderBy(desc(schema.planAssignments.startDate)),
      db
        .select({
          date: schema.workoutLogs.date,
          minutes: sql<number>`coalesce(sum(${schema.workoutLogs.durationMinutes}), 0)::int`,
        })
        .from(schema.workoutLogs)
        .where(and(eq(schema.workoutLogs.memberId, id), gte(schema.workoutLogs.date, weekAgo), lte(schema.workoutLogs.date, day)))
        .groupBy(schema.workoutLogs.date)
        .orderBy(asc(schema.workoutLogs.date)),
    ]);

    if (!member) throw notFound("Member");

    // Booked time, forward-looking. A coach opening a member before a session
    // wants to know what is next, not what already happened.
    const schedule = await db
      .select({
        id: schema.appointments.id,
        kind: schema.appointments.kind,
        title: schema.appointments.title,
        location: schema.appointments.location,
        startsAt: schema.appointments.startsAt,
        endsAt: schema.appointments.endsAt,
        status: schema.appointments.status,
      })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.memberId, id),
          eq(schema.appointments.coachId, req.user!.id),
          gte(schema.appointments.startsAt, new Date(`${day}T00:00:00.000Z`)),
        ),
      )
      .orderBy(asc(schema.appointments.startsAt))
      .limit(10);

    const totals = meals.reduce(
      (acc, m) => ({
        calories: acc.calories + Number(m.calories ?? 0),
        proteinG: acc.proteinG + Number(m.proteinG ?? 0),
      }),
      { calories: 0, proteinG: 0 },
    );

    // Goal adherence over the same week, so the coach sees follow-through
    // rather than only what was set.
    const entries = goals.length
      ? await db
          .select({ goalId: schema.goalEntries.goalId, date: schema.goalEntries.date, achieved: schema.goalEntries.achieved })
          .from(schema.goalEntries)
          .where(and(inArray(schema.goalEntries.goalId, goals.map((g) => g.id)), gte(schema.goalEntries.date, weekAgo), lte(schema.goalEntries.date, day)))
      : [];

    return {
      member,
      date: day,
      latestWeightKg: latest?.weightKg ?? null,
      today: {
        meals,
        workouts,
        hydrationMl: hydration[0]?.ml ?? 0,
        calories: Math.round(totals.calories),
        proteinG: Math.round(totals.proteinG),
      },
      week: { trend, from: weekAgo, to: day },
      goals: goals.map((g) => {
        const mine = entries.filter((e) => e.goalId === g.id);
        return { ...g, achieved: mine.filter((e) => e.achieved).length, evaluated: mine.length };
      }),
      schedule,
      // Split so the client can say "no meal plan" and "no exercise plan"
      // separately --- one missing is a different conversation from both.
      mealPlan: assignments.find((a) => a.planType === "meal") ?? null,
      workoutPlan: assignments.find((a) => a.planType === "workout") ?? null,
      assignments,
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
