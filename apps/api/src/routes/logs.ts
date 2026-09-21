import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { badRequest, notFound } from "../errors.js";
import { assertCanReadMember } from "../lib/access.js";
import { activityKcal } from "../lib/nutrition.js";
import { planDayMatchesDate } from "../lib/planDay.js";

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
   * Log a meal as a PLATE: any mix of catalog meals and individual foods, each
   * with its own quantity. Macros are summed from the items server-side and
   * snapshotted, so editing a recipe later never rewrites what someone ate.
   *
   * `loggedAt` places it on the day timeline. Without a real time the home
   * screen cannot interleave meals and training in the order they happened.
   */
  app.post("/logs/meals", { preHandler: auth }, async (req, reply) => {
    const body = z
      .object({
        date: isoDate,
        mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        loggedAt: z.string().datetime().optional(),
        photoUrl: z.string().url().optional(),
        notes: z.string().max(500).optional(),
        items: z
          .array(
            z.object({
              foodId: z.string().uuid().optional(),
              mealId: z.string().uuid().optional(),
              quantity: z.coerce.number().min(0.01).max(5000),
              unit: z.string().max(12).default("g"),
            }),
          )
          .min(1)
          .max(40)
          .optional(),
        // Shorthand for the common case: one catalog meal, one serving.
        // Forcing every caller to wrap a single meal in an array buys nothing.
        mealId: z.string().uuid().optional(),
        servings: z.coerce.number().min(0.01).max(20).default(1),
      })
      .refine((b) => b.items?.length || b.mealId, { message: "Provide items[] or a mealId" })
      .parse(req.body);

    const items = body.items ?? [{ mealId: body.mealId!, quantity: body.servings, unit: "serving" }];

    // Resolve every line to real nutrition before writing anything, so a bad
    // id fails the whole plate rather than saving half of it.
    const lines: {
      foodId: string | null; name: string; quantity: number; unit: string;
      calories: number; proteinG: number; carbsG: number; fatG: number;
    }[] = [];

    for (const item of items) {
      if (item.mealId) {
        const meal = await db.query.meals.findFirst({ where: eq(schema.meals.id, item.mealId) });
        if (!meal) throw notFound("Meal");
        // For a catalog meal, quantity is a serving multiplier.
        const n = item.quantity;
        lines.push({
          foodId: null, name: meal.name, quantity: n, unit: "serving",
          calories: Number(meal.calories) * n, proteinG: Number(meal.proteinG) * n,
          carbsG: Number(meal.carbsG) * n, fatG: Number(meal.fatG) * n,
        });
      } else if (item.foodId) {
        const food = await db.query.foods.findFirst({ where: eq(schema.foods.id, item.foodId) });
        if (!food) throw notFound("Food");
        // Foods are stored per serving_size (100 g/ml for the catalog).
        const factor = item.quantity / Number(food.servingSize || 100);
        lines.push({
          foodId: food.id, name: food.name, quantity: item.quantity, unit: item.unit || food.servingUnit,
          calories: Number(food.calories) * factor, proteinG: Number(food.proteinG) * factor,
          carbsG: Number(food.carbsG) * factor, fatG: Number(food.fatG) * factor,
        });
      } else {
        throw badRequest("Each item needs a foodId or a mealId");
      }
    }

    const total = lines.reduce(
      (a, l) => ({
        calories: a.calories + l.calories, proteinG: a.proteinG + l.proteinG,
        carbsG: a.carbsG + l.carbsG, fatG: a.fatG + l.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );
    const r1 = (n: number) => String(Math.round(n * 10) / 10);

    const log = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.mealLogs)
        .values({
          memberId: req.user!.id,
          mealId: items.length === 1 ? (items[0]!.mealId ?? null) : null,
          date: body.date,
          mealType: body.mealType,
          photoUrl: body.photoUrl ?? null,
          notes: body.notes ?? null,
          loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
          calories: String(Math.round(total.calories)),
          proteinG: r1(total.proteinG), carbsG: r1(total.carbsG), fatG: r1(total.fatG),
        })
        .returning();

      await tx.insert(schema.mealLogItems).values(
        lines.map((l, i) => ({
          mealLogId: row!.id, foodId: l.foodId, nameSnapshot: l.name,
          quantity: String(l.quantity), unit: l.unit, position: i,
          calories: String(Math.round(l.calories)), proteinG: r1(l.proteinG),
          carbsG: r1(l.carbsG), fatG: r1(l.fatG),
        })),
      );
      return row!;
    });

    reply.code(201);
    return { mealLog: log, items: lines.length };
  });

  /** One logged meal with everything on the plate, for the detail view. */
  app.get("/logs/meals/:id", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const log = await db.query.mealLogs.findFirst({ where: eq(schema.mealLogs.id, id) });
    if (!log) throw notFound("Meal log");
    await assertCanReadMember(req.user!, log.memberId);

    const items = await db
      .select()
      .from(schema.mealLogItems)
      .where(eq(schema.mealLogItems.mealLogId, id))
      .orderBy(asc(schema.mealLogItems.position));
    return { mealLog: log, items };
  });

  app.delete("/logs/meals/:id", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const log = await db.query.mealLogs.findFirst({ where: eq(schema.mealLogs.id, id) });
    if (!log) throw notFound("Meal log");
    if (log.memberId !== req.user!.id) throw notFound("Meal log");
    await db.delete(schema.mealLogs).where(eq(schema.mealLogs.id, id));
    return { ok: true };
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
        startedAt: z.string().datetime().optional(),
        notes: z.string().max(500).optional(),
        /** Overrides the MET estimate when the member has a tracker reading. */
        caloriesBurned: z.coerce.number().int().min(0).max(10000).optional(),
      })
      .parse(req.body);

    const activity = await db.query.activities.findFirst({ where: eq(schema.activities.id, body.activityId) });
    if (!activity) throw notFound("Activity");

    const latestWeight = await db.query.bodyMetrics.findFirst({
      where: eq(schema.bodyMetrics.memberId, req.user!.id),
      orderBy: desc(schema.bodyMetrics.date),
    });
    const weightKg = Number(latestWeight?.weightKg ?? 75);
    const started = body.startedAt ? new Date(body.startedAt) : new Date();

    const [row] = await db
      .insert(schema.workoutLogs)
      .values({
        memberId: req.user!.id,
        date: body.date,
        activityId: activity.id,
        title: activity.name,
        durationMinutes: body.durationMinutes,
        intensity: body.intensity ?? activity.intensity,
        // A measured burn beats an estimate; the MET formula is the fallback.
        caloriesBurned: body.caloriesBurned ?? activityKcal(Number(activity.met), weightKg, body.durationMinutes),
        notes: body.notes ?? null,
        startedAt: started,
        endedAt: new Date(started.getTime() + body.durationMinutes * 60000),
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


  /**
   * Log one exercise with its sets. This is the counterpart to /logs/activity:
   * an activity is a bout (duration + intensity), an exercise is sets. Which
   * fields a set carries follows the exercise's loggingMode, so a plank records
   * seconds and a farmer's walk records metres --- the schema has had the
   * columns since migration 0001 but nothing wrote to them.
   */
  app.post("/logs/exercise", { preHandler: auth }, async (req, reply) => {
    const body = z
      .object({
        date: isoDate,
        exerciseId: z.string().uuid(),
        workoutLogId: z.string().uuid().optional(),
        notes: z.string().max(500).optional(),
        sets: z
          .array(
            z.object({
              reps: z.coerce.number().int().min(0).max(1000).optional(),
              weightKg: z.coerce.number().min(0).max(1000).optional(),
              durationSeconds: z.coerce.number().int().min(1).max(86400).optional(),
              distanceMetres: z.coerce.number().min(1).max(100000).optional(),
              rounds: z.coerce.number().int().min(1).max(500).optional(),
              rpe: z.coerce.number().min(1).max(10).optional(),
              completed: z.boolean().default(true),
            }),
          )
          .min(1)
          .max(30),
      })
      .parse(req.body);

    const exercise = await db.query.exercises.findFirst({ where: eq(schema.exercises.id, body.exerciseId) });
    if (!exercise) throw notFound("Exercise");

    // Reject a set that carries nothing for the mode it is logged in, rather
    // than silently storing an empty row the member will see as "0 reps".
    const required: Record<string, keyof (typeof body.sets)[number]> = {
      reps: "reps",
      hold: "durationSeconds",
      distance: "distanceMetres",
      duration: "durationSeconds",
      rounds: "rounds",
    };
    const field = required[exercise.loggingMode];
    const bad = body.sets.findIndex((s) => field && s[field] == null);
    if (bad >= 0) {
      throw badRequest(
        `"${exercise.name}" is logged by ${exercise.loggingMode}; set ${bad + 1} is missing ${String(field)}`,
        "logging_mode_mismatch",
      );
    }

    const result = await db.transaction(async (tx) => {
      // All of a day's exercises hang off one workout_log, so the day reads as
      // a session rather than as a pile of unrelated rows.
      let logId = body.workoutLogId;
      if (!logId) {
        const existing = await tx.query.workoutLogs.findFirst({
          where: and(
            eq(schema.workoutLogs.memberId, req.user!.id),
            eq(schema.workoutLogs.date, body.date),
            isNull(schema.workoutLogs.activityId),
          ),
        });
        logId = existing?.id;
      }
      if (!logId) {
        const [created] = await tx
          .insert(schema.workoutLogs)
          .values({
            memberId: req.user!.id,
            date: body.date,
            // Named after the first exercise logged into it, so the timeline
            // reads "Barbell bench press +2" rather than an anonymous "Workout".
            title: exercise.name,
            notes: body.notes ?? null,
            completedAt: new Date(),
          })
          .returning();
        logId = created!.id;
      }

      const nextSet = await tx
        .select({ n: sql<number>`coalesce(max(${schema.workoutLogSets.setNumber}), 0)::int` })
        .from(schema.workoutLogSets)
        .where(and(eq(schema.workoutLogSets.workoutLogId, logId), eq(schema.workoutLogSets.exerciseId, body.exerciseId)));

      const rows = await tx
        .insert(schema.workoutLogSets)
        .values(
          body.sets.map((s, i) => ({
            workoutLogId: logId!,
            exerciseId: body.exerciseId,
            setNumber: (nextSet[0]?.n ?? 0) + i + 1,
            reps: s.reps ?? null,
            weightKg: s.weightKg != null ? String(s.weightKg) : null,
            durationSeconds: s.durationSeconds ?? null,
            distanceMetres: s.distanceMetres != null ? String(s.distanceMetres) : null,
            rounds: s.rounds ?? null,
            rpe: s.rpe != null ? String(s.rpe) : null,
            completed: s.completed,
          })),
        )
        .returning();

      return { workoutLogId: logId!, sets: rows };
    });

    reply.code(201);
    return result;
  });

  /**
   * A day's exercise work: what the coach prescribed for today, and what the
   * member actually logged. One request, because the screen shows both lists
   * side by side and they are meaningless apart.
   */
  app.get("/logs/exercises", { preHandler: auth }, async (req) => {
    const { date, memberId } = z
      .object({ date: isoDate, memberId: z.string().uuid().optional() })
      .parse(req.query);
    const member = memberId ?? req.user!.id;
    await assertCanReadMember(req.user!, member);

    const logged = await db
      .select({
        setId: schema.workoutLogSets.id,
        workoutLogId: schema.workoutLogSets.workoutLogId,
        setNumber: schema.workoutLogSets.setNumber,
        reps: schema.workoutLogSets.reps,
        weightKg: schema.workoutLogSets.weightKg,
        durationSeconds: schema.workoutLogSets.durationSeconds,
        distanceMetres: schema.workoutLogSets.distanceMetres,
        rounds: schema.workoutLogSets.rounds,
        rpe: schema.workoutLogSets.rpe,
        exercise: {
          id: schema.exercises.id,
          slug: schema.exercises.slug,
          name: schema.exercises.name,
          discipline: schema.exercises.discipline,
          loggingMode: schema.exercises.loggingMode,
          primaryMuscle: schema.exercises.primaryMuscle,
        },
      })
      .from(schema.workoutLogSets)
      .innerJoin(schema.workoutLogs, eq(schema.workoutLogs.id, schema.workoutLogSets.workoutLogId))
      .innerJoin(schema.exercises, eq(schema.exercises.id, schema.workoutLogSets.exerciseId))
      .where(and(eq(schema.workoutLogs.memberId, member), eq(schema.workoutLogs.date, date)))
      .orderBy(asc(schema.workoutLogSets.setNumber));

    // Group the flat set rows by exercise for rendering.
    const byExercise = new Map<string, { exercise: (typeof logged)[number]["exercise"]; sets: unknown[] }>();
    for (const row of logged) {
      const entry = byExercise.get(row.exercise.id) ?? { exercise: row.exercise, sets: [] };
      entry.sets.push({
        id: row.setId, setNumber: row.setNumber, reps: row.reps, weightKg: row.weightKg,
        durationSeconds: row.durationSeconds, distanceMetres: row.distanceMetres, rounds: row.rounds, rpe: row.rpe,
      });
      byExercise.set(row.exercise.id, entry);
    }

    // Prescribed work: the day of an active plan that lands on THIS date.
    // Without planDayMatchesDate every day of the block came back on every
    // date, so a four-day plan showed four days of work each morning.
    const onThisDay = and(
      eq(schema.planAssignments.memberId, member),
      lte(schema.planAssignments.startDate, date),
      or(isNull(schema.planAssignments.endDate), gte(schema.planAssignments.endDate, date))!,
      inArray(schema.planAssignments.status, ["scheduled", "active"]),
      planDayMatchesDate(date),
    );

    const prescribed = await db
      .select({
        planExerciseId: schema.planExercises.id,
        planName: schema.plans.name,
        position: schema.planExercises.position,
        sets: schema.planExercises.sets,
        reps: schema.planExercises.reps,
        weightKg: schema.planExercises.weightKg,
        restSeconds: schema.planExercises.restSeconds,
        durationSeconds: schema.planExercises.durationSeconds,
        notes: schema.planExercises.notes,
        exercise: {
          id: schema.exercises.id,
          slug: schema.exercises.slug,
          name: schema.exercises.name,
          discipline: schema.exercises.discipline,
          loggingMode: schema.exercises.loggingMode,
          equipment: schema.exercises.equipment,
          primaryMuscle: schema.exercises.primaryMuscle,
        },
      })
      .from(schema.planAssignments)
      .innerJoin(schema.plans, eq(schema.plans.id, schema.planAssignments.planId))
      .innerJoin(schema.planDays, eq(schema.planDays.planId, schema.plans.id))
      .innerJoin(schema.planExercises, eq(schema.planExercises.planDayId, schema.planDays.id))
      .innerJoin(schema.exercises, eq(schema.exercises.id, schema.planExercises.exerciseId))
      .where(onThisDay)
      .orderBy(asc(schema.planExercises.position));

    // Sports and other bouts are prescribed on the same days but logged by
    // duration, so they are a separate list rather than a set-shaped fake.
    const prescribedActivities = await db
      .select({
        planExerciseId: schema.planExercises.id,
        planName: schema.plans.name,
        durationSeconds: schema.planExercises.durationSeconds,
        intensity: schema.planExercises.intensity,
        notes: schema.planExercises.notes,
        activity: {
          id: schema.activities.id,
          slug: schema.activities.slug,
          name: schema.activities.name,
          group: schema.activities.group,
          met: schema.activities.met,
        },
      })
      .from(schema.planAssignments)
      .innerJoin(schema.plans, eq(schema.plans.id, schema.planAssignments.planId))
      .innerJoin(schema.planDays, eq(schema.planDays.planId, schema.plans.id))
      .innerJoin(schema.planExercises, eq(schema.planExercises.planDayId, schema.planDays.id))
      .innerJoin(schema.activities, eq(schema.activities.id, schema.planExercises.activityId))
      .where(onThisDay)
      .orderBy(asc(schema.planExercises.position));

    // A rest day the coach wrote is information, not silence --- the member
    // should be told to rest rather than left wondering what to do.
    const restDay = await db
      .select({ planName: schema.plans.name, notes: schema.planDays.notes })
      .from(schema.planAssignments)
      .innerJoin(schema.plans, eq(schema.plans.id, schema.planAssignments.planId))
      .innerJoin(schema.planDays, eq(schema.planDays.planId, schema.plans.id))
      .where(and(onThisDay, eq(schema.planDays.isRestDay, true), eq(schema.plans.type, "workout")))
      .limit(1);

    const doneIds = new Set(byExercise.keys());
    const loggedActivityIds = new Set(
      (await db
        .select({ activityId: schema.workoutLogs.activityId })
        .from(schema.workoutLogs)
        .where(and(eq(schema.workoutLogs.memberId, member), eq(schema.workoutLogs.date, date))))
        .map((r) => r.activityId)
        .filter(Boolean) as string[],
    );

    return {
      date,
      prescribed: prescribed.map((p) => ({ ...p, logged: doneIds.has(p.exercise.id) })),
      prescribedActivities: prescribedActivities.map((p) => ({ ...p, logged: loggedActivityIds.has(p.activity.id) })),
      restDay: prescribed.length === 0 && prescribedActivities.length === 0 && restDay[0] ? restDay[0] : null,
      logged: [...byExercise.values()],
    };
  });


  /**
   * Edit a logged session. The member changed their mind about the time, the
   * intensity, or how long it really was --- without this the only fix is to
   * delete and re-log, which loses the sets hanging off it.
   */
  app.patch("/logs/workout/:id", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        title: z.string().min(1).max(160).optional(),
        durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
        intensity: z.enum(["light", "moderate", "vigorous"]).optional(),
        startedAt: z.string().datetime().optional(),
        caloriesBurned: z.coerce.number().int().min(0).max(10000).optional(),
        activityId: z.string().uuid().optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(req.body);

    const existing = await db.query.workoutLogs.findFirst({ where: eq(schema.workoutLogs.id, id) });
    if (!existing || existing.memberId !== req.user!.id) throw notFound("Workout log");

    const started = body.startedAt ? new Date(body.startedAt) : existing.startedAt;
    const minutes = body.durationMinutes ?? existing.durationMinutes;

    // Recompute the burn when the inputs to it move, unless the caller supplied
    // a measured figure --- a stale calorie number is worse than none.
    let kcal = body.caloriesBurned;
    if (kcal == null && (body.durationMinutes || body.activityId)) {
      const activityId = body.activityId ?? existing.activityId;
      if (activityId && minutes) {
        const activity = await db.query.activities.findFirst({ where: eq(schema.activities.id, activityId) });
        const weight = await db.query.bodyMetrics.findFirst({
          where: eq(schema.bodyMetrics.memberId, req.user!.id),
          orderBy: desc(schema.bodyMetrics.date),
        });
        if (activity) kcal = activityKcal(Number(activity.met), Number(weight?.weightKg ?? 75), minutes);
      }
    }

    const [row] = await db
      .update(schema.workoutLogs)
      .set({
        ...body,
        startedAt: started,
        endedAt: started && minutes ? new Date(started.getTime() + minutes * 60000) : existing.endedAt,
        caloriesBurned: kcal ?? existing.caloriesBurned,
      })
      .where(eq(schema.workoutLogs.id, id))
      .returning();
    return { workoutLog: row };
  });

  app.delete("/logs/workout/:id", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const existing = await db.query.workoutLogs.findFirst({ where: eq(schema.workoutLogs.id, id) });
    if (!existing || existing.memberId !== req.user!.id) throw notFound("Workout log");
    await db.delete(schema.workoutLogs).where(eq(schema.workoutLogs.id, id));
    return { ok: true };
  });

  app.delete("/logs/sets/:id", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const [row] = await db
      .select({ memberId: schema.workoutLogs.memberId })
      .from(schema.workoutLogSets)
      .innerJoin(schema.workoutLogs, eq(schema.workoutLogs.id, schema.workoutLogSets.workoutLogId))
      .where(eq(schema.workoutLogSets.id, id));
    if (!row || row.memberId !== req.user!.id) throw notFound("Set");
    await db.delete(schema.workoutLogSets).where(eq(schema.workoutLogSets.id, id));
    return { ok: true };
  });

  /**
   * The day as it actually happened: meals and training interleaved in time
   * order. This is what the home screen renders --- breakfast 08:00, session
   * 09:30, recovery snack 11:00 --- rather than two lists that hide the shape
   * of someone's day.
   */
  app.get("/logs/timeline", { preHandler: auth }, async (req) => {
    const { date, memberId } = z
      .object({ date: isoDate, memberId: z.string().uuid().optional() })
      .parse(req.query);
    const member = memberId ?? req.user!.id;
    await assertCanReadMember(req.user!, member);

    const [meals, workouts, sets, hydration, target] = await Promise.all([
      db
        .select({
          id: schema.mealLogs.id, mealType: schema.mealLogs.mealType, loggedAt: schema.mealLogs.loggedAt,
          calories: schema.mealLogs.calories, proteinG: schema.mealLogs.proteinG,
          carbsG: schema.mealLogs.carbsG, fatG: schema.mealLogs.fatG,
          photoUrl: schema.mealLogs.photoUrl, notes: schema.mealLogs.notes,
        })
        .from(schema.mealLogs)
        .where(and(eq(schema.mealLogs.memberId, member), eq(schema.mealLogs.date, date))),
      db
        .select({
          id: schema.workoutLogs.id, title: schema.workoutLogs.title,
          startedAt: schema.workoutLogs.startedAt, endedAt: schema.workoutLogs.endedAt,
          durationMinutes: schema.workoutLogs.durationMinutes, caloriesBurned: schema.workoutLogs.caloriesBurned,
          intensity: schema.workoutLogs.intensity, activityId: schema.workoutLogs.activityId,
          activityName: schema.activities.name, createdAt: schema.workoutLogs.createdAt,
        })
        .from(schema.workoutLogs)
        .leftJoin(schema.activities, eq(schema.activities.id, schema.workoutLogs.activityId))
        .where(and(eq(schema.workoutLogs.memberId, member), eq(schema.workoutLogs.date, date))),
      db
        .select({
          workoutLogId: schema.workoutLogSets.workoutLogId,
          exerciseName: schema.exercises.name,
          exerciseId: schema.exercises.id,
        })
        .from(schema.workoutLogSets)
        .innerJoin(schema.workoutLogs, eq(schema.workoutLogs.id, schema.workoutLogSets.workoutLogId))
        .innerJoin(schema.exercises, eq(schema.exercises.id, schema.workoutLogSets.exerciseId))
        .where(and(eq(schema.workoutLogs.memberId, member), eq(schema.workoutLogs.date, date))),
      db
        .select({ ml: sql<number>`coalesce(sum(${schema.hydrationLogs.amountMl}), 0)::int` })
        .from(schema.hydrationLogs)
        .where(and(eq(schema.hydrationLogs.memberId, member), eq(schema.hydrationLogs.date, date))),
      db.query.hydrationGoals.findFirst({ where: eq(schema.hydrationGoals.memberId, member) }),
    ]);

    const exercisesByLog = new Map<string, string[]>();
    for (const s of sets) {
      const list = exercisesByLog.get(s.workoutLogId) ?? [];
      if (!list.includes(s.exerciseName)) list.push(s.exerciseName);
      exercisesByLog.set(s.workoutLogId, list);
    }

    type Entry = {
      kind: "meal" | "workout"; id: string; at: string; title: string;
      calories: number; proteinG?: number; carbsG?: number; fatG?: number;
      mealType?: string | null; durationMinutes?: number | null; intensity?: string | null;
      exercises?: string[]; photoUrl?: string | null; setCount?: number;
    };

    const entries: Entry[] = [
      ...meals.map((m) => ({
        kind: "meal" as const, id: m.id,
        at: (m.loggedAt ?? new Date()).toISOString(),
        title: m.mealType ?? "Meal", mealType: m.mealType,
        calories: Math.round(Number(m.calories)), proteinG: Number(m.proteinG),
        carbsG: Number(m.carbsG), fatG: Number(m.fatG), photoUrl: m.photoUrl,
      })),
      ...workouts.map((w) => ({
        kind: "workout" as const, id: w.id,
        // Fall back to creation time so a session logged before this feature
        // existed still lands somewhere sensible rather than at midnight.
        at: (w.startedAt ?? w.createdAt).toISOString(),
        title: w.title ?? w.activityName ?? "Training",
        calories: w.caloriesBurned ?? 0,
        durationMinutes: w.durationMinutes, intensity: w.intensity,
        exercises: exercisesByLog.get(w.id) ?? [],
        setCount: sets.filter((s) => s.workoutLogId === w.id).length,
      })),
    ].sort((a, b) => a.at.localeCompare(b.at));

    const eaten = meals.reduce(
      (a, m) => ({
        calories: a.calories + Number(m.calories), proteinG: a.proteinG + Number(m.proteinG),
        carbsG: a.carbsG + Number(m.carbsG), fatG: a.fatG + Number(m.fatG),
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );

    return {
      date,
      entries,
      // Which of the four slots already has something, so the home screen can
      // render a tick instead of a plus without a second request.
      loggedSlots: [...new Set(meals.map((m) => m.mealType).filter(Boolean))],
      totals: {
        calories: Math.round(eaten.calories), proteinG: Math.round(eaten.proteinG * 10) / 10,
        carbsG: Math.round(eaten.carbsG * 10) / 10, fatG: Math.round(eaten.fatG * 10) / 10,
        caloriesBurned: workouts.reduce((n, w) => n + (w.caloriesBurned ?? 0), 0),
      },
      hydration: { totalMl: hydration[0]?.ml ?? 0, targetMl: target?.dailyTargetMl ?? 2500 },
    };
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
