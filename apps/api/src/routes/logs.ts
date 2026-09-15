import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { badRequest, notFound } from "../errors.js";
import { assertCanReadMember } from "../lib/access.js";
import { activityKcal } from "../lib/nutrition.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const num = (max: number) => z.coerce.number().min(0).max(max).transform(String);

export const logRoutes: FastifyPluginAsync = async (app) => {
  const auth = (req: Parameters<typeof app.requireAuth>[0]) => app.requireAuth(req);

  /**
   * Everything logged on one day, for one member. This is what the member home
   * and the coach's member detail both render, so it is a single round trip
   * rather than five.
   */
  app.get("/logs/day", { preHandler: auth }, async (req) => {
    const { date, memberId } = z
      .object({ date: isoDate, memberId: z.string().uuid().optional() })
      .parse(req.query);
    const member = memberId ?? req.user!.id;
    await assertCanReadMember(req.user!, member);

    const [meals, workouts, hydration, metrics, targetRow] = await Promise.all([
      db
        .select({
          id: schema.mealLogs.id,
          mealType: schema.mealLogs.mealType,
          calories: schema.mealLogs.calories,
          proteinG: schema.mealLogs.proteinG,
          carbsG: schema.mealLogs.carbsG,
          fatG: schema.mealLogs.fatG,
          photoUrl: schema.mealLogs.photoUrl,
          notes: schema.mealLogs.notes,
          loggedAt: schema.mealLogs.loggedAt,
          mealName: schema.meals.name,
        })
        .from(schema.mealLogs)
        .leftJoin(schema.meals, eq(schema.meals.id, schema.mealLogs.mealId))
        .where(and(eq(schema.mealLogs.memberId, member), eq(schema.mealLogs.date, date)))
        .orderBy(asc(schema.mealLogs.loggedAt)),
      db
        .select({
          id: schema.workoutLogs.id,
          title: schema.workoutLogs.title,
          durationMinutes: schema.workoutLogs.durationMinutes,
          caloriesBurned: schema.workoutLogs.caloriesBurned,
          intensity: schema.workoutLogs.intensity,
          completedAt: schema.workoutLogs.completedAt,
          activityName: schema.activities.name,
        })
        .from(schema.workoutLogs)
        .leftJoin(schema.activities, eq(schema.activities.id, schema.workoutLogs.activityId))
        .where(and(eq(schema.workoutLogs.memberId, member), eq(schema.workoutLogs.date, date))),
      db
        .select({ total: sql<number>`coalesce(sum(${schema.hydrationLogs.amountMl}), 0)::int` })
        .from(schema.hydrationLogs)
        .where(and(eq(schema.hydrationLogs.memberId, member), eq(schema.hydrationLogs.date, date))),
      db.query.bodyMetrics.findFirst({
        where: and(eq(schema.bodyMetrics.memberId, member), eq(schema.bodyMetrics.date, date)),
      }),
      db.query.hydrationGoals.findFirst({ where: eq(schema.hydrationGoals.memberId, member) }),
    ]);

    const totals = meals.reduce(
      (acc, m) => ({
        calories: acc.calories + Number(m.calories ?? 0),
        proteinG: acc.proteinG + Number(m.proteinG ?? 0),
        carbsG: acc.carbsG + Number(m.carbsG ?? 0),
        fatG: acc.fatG + Number(m.fatG ?? 0),
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );

    return {
      date,
      meals,
      workouts,
      hydration: { totalMl: hydration[0]?.total ?? 0, targetMl: targetRow?.dailyTargetMl ?? 2500 },
      bodyMetrics: metrics ?? null,
      totals: {
        calories: Math.round(totals.calories),
        proteinG: Math.round(totals.proteinG * 10) / 10,
        carbsG: Math.round(totals.carbsG * 10) / 10,
        fatG: Math.round(totals.fatG * 10) / 10,
        caloriesBurned: workouts.reduce((n, w) => n + (w.caloriesBurned ?? 0), 0),
      },
    };
  });

  /**
   * Log a meal. Passing a catalog `mealId` copies its macros so the log stays
   * correct even if the meal is later edited --- a diary that rewrites history
   * when a recipe changes is not a diary.
   */
  app.post("/logs/meals", { preHandler: auth }, async (req, reply) => {
    const body = z
      .object({
        date: isoDate,
        mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        mealId: z.string().uuid().optional(),
        servings: z.coerce.number().min(0.1).max(20).default(1),
        calories: z.coerce.number().min(0).max(10000).optional(),
        proteinG: z.coerce.number().min(0).max(1000).optional(),
        carbsG: z.coerce.number().min(0).max(1000).optional(),
        fatG: z.coerce.number().min(0).max(1000).optional(),
        photoUrl: z.string().url().optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(req.body);

    let macros = {
      calories: body.calories ?? 0,
      proteinG: body.proteinG ?? 0,
      carbsG: body.carbsG ?? 0,
      fatG: body.fatG ?? 0,
    };

    if (body.mealId) {
      const meal = await db.query.meals.findFirst({ where: eq(schema.meals.id, body.mealId) });
      if (!meal) throw notFound("Meal");
      const s = body.servings;
      macros = {
        calories: Number(meal.calories) * s,
        proteinG: Number(meal.proteinG) * s,
        carbsG: Number(meal.carbsG) * s,
        fatG: Number(meal.fatG) * s,
      };
    } else if (body.calories == null) {
      throw badRequest("Provide either a mealId or explicit macros");
    }

    const [row] = await db
      .insert(schema.mealLogs)
      .values({
        memberId: req.user!.id,
        mealId: body.mealId ?? null,
        date: body.date,
        mealType: body.mealType,
        photoUrl: body.photoUrl ?? null,
        notes: body.notes ?? null,
        calories: String(Math.round(macros.calories)),
        proteinG: String(Math.round(macros.proteinG * 10) / 10),
        carbsG: String(Math.round(macros.carbsG * 10) / 10),
        fatG: String(Math.round(macros.fatG * 10) / 10),
      })
      .returning();
    reply.code(201);
    return { mealLog: row };
  });

  /**
   * Log a bout: "played squash for 50 minutes". Calories come from the
   * activity's MET and the member's most recent weight, not from the client,
   * so two members doing the same session get different and correct numbers.
   */
  app.post("/logs/activity", { preHandler: auth }, async (req, reply) => {
    const body = z
      .object({
        date: isoDate,
        activityId: z.string().uuid(),
        durationMinutes: z.coerce.number().int().min(1).max(1440),
        intensity: z.enum(["light", "moderate", "vigorous"]).optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(req.body);

    const activity = await db.query.activities.findFirst({ where: eq(schema.activities.id, body.activityId) });
    if (!activity) throw notFound("Activity");

    const latestWeight = await db.query.bodyMetrics.findFirst({
      where: eq(schema.bodyMetrics.memberId, req.user!.id),
      orderBy: desc(schema.bodyMetrics.date),
    });
    const weightKg = Number(latestWeight?.weightKg ?? 75);

    const [row] = await db
      .insert(schema.workoutLogs)
      .values({
        memberId: req.user!.id,
        date: body.date,
        activityId: activity.id,
        title: activity.name,
        durationMinutes: body.durationMinutes,
        intensity: body.intensity ?? activity.intensity,
        caloriesBurned: activityKcal(Number(activity.met), weightKg, body.durationMinutes),
        notes: body.notes ?? null,
        completedAt: new Date(),
      })
      .returning();
    reply.code(201);
    return { workoutLog: row, basis: { met: activity.met, weightKg } };
  });

  app.post("/logs/hydration", { preHandler: auth }, async (req, reply) => {
    const body = z.object({ date: isoDate, amountMl: z.coerce.number().int().min(1).max(5000) }).parse(req.body);
    const [row] = await db
      .insert(schema.hydrationLogs)
      .values({ memberId: req.user!.id, date: body.date, amountMl: body.amountMl })
      .returning();
    reply.code(201);
    return { hydrationLog: row };
  });

  app.post("/logs/body-metrics", { preHandler: auth }, async (req, reply) => {
    const body = z
      .object({
        date: isoDate,
        weightKg: num(500).optional(),
        bodyFatPct: num(80).optional(),
        measurements: z.record(z.string(), z.number()).optional(),
      })
      .parse(req.body);

    // One row per member per day; a correction replaces rather than stacks.
    const [row] = await db
      .insert(schema.bodyMetrics)
      .values({ memberId: req.user!.id, ...body })
      .onConflictDoUpdate({
        target: [schema.bodyMetrics.memberId, schema.bodyMetrics.date],
        set: { weightKg: body.weightKg, bodyFatPct: body.bodyFatPct, measurements: body.measurements },
      })
      .returning();
    reply.code(201);
    return { bodyMetrics: row };
  });

  /** Weekly series for the Progress screen's bar charts. */
  app.get("/logs/series", { preHandler: auth }, async (req) => {
    const { from, to, memberId } = z
      .object({ from: isoDate, to: isoDate, memberId: z.string().uuid().optional() })
      .parse(req.query);
    const member = memberId ?? req.user!.id;
    await assertCanReadMember(req.user!, member);

    const [hydration, activity, weight] = await Promise.all([
      db
        .select({ date: schema.hydrationLogs.date, ml: sql<number>`sum(${schema.hydrationLogs.amountMl})::int` })
        .from(schema.hydrationLogs)
        .where(and(eq(schema.hydrationLogs.memberId, member), gte(schema.hydrationLogs.date, from), lte(schema.hydrationLogs.date, to)))
        .groupBy(schema.hydrationLogs.date)
        .orderBy(asc(schema.hydrationLogs.date)),
      db
        .select({
          date: schema.workoutLogs.date,
          minutes: sql<number>`coalesce(sum(${schema.workoutLogs.durationMinutes}), 0)::int`,
          kcal: sql<number>`coalesce(sum(${schema.workoutLogs.caloriesBurned}), 0)::int`,
        })
        .from(schema.workoutLogs)
        .where(and(eq(schema.workoutLogs.memberId, member), gte(schema.workoutLogs.date, from), lte(schema.workoutLogs.date, to)))
        .groupBy(schema.workoutLogs.date)
        .orderBy(asc(schema.workoutLogs.date)),
      db
        .select({ date: schema.bodyMetrics.date, weightKg: schema.bodyMetrics.weightKg })
        .from(schema.bodyMetrics)
        .where(and(eq(schema.bodyMetrics.memberId, member), gte(schema.bodyMetrics.date, from), lte(schema.bodyMetrics.date, to)))
        .orderBy(asc(schema.bodyMetrics.date)),
    ]);

    return { from, to, hydration, activity, weight };
  });
};
