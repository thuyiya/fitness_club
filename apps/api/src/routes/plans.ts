import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { ApiError, badRequest, notFound } from "../errors.js";
import { assertCanReadMember, assertOwnsPlan } from "../lib/access.js";
import { notify } from "../lib/notify.js";
import { dayCoordsForOffset, daysBetween } from "../lib/planDay.js";

const planBody = z.object({
  type: z.enum(["workout", "meal"]),
  name: z.string().min(1).max(160),
  goal: z.string().max(200).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  durationWeeks: z.coerce.number().int().min(1).max(52).optional(),
  gymId: z.string().uuid().optional(),
  isTemplate: z.boolean().default(false),
});

/**
 * A prescribed exercise. Which fields are meaningful follows the exercise's
 * loggingMode: reps+weight for a press, durationSeconds for a plank. The API
 * accepts all of them and the client shows the right ones.
 */
const planExerciseBody = z
  .object({
    exerciseId: z.string().uuid().optional(),
    /** A sport or other bout, prescribed by duration rather than sets. */
    activityId: z.string().uuid().optional(),
    position: z.coerce.number().int().min(0).default(0),
    sets: z.coerce.number().int().min(1).max(20).optional(),
    reps: z.coerce.number().int().min(1).max(500).optional(),
    // numeric columns round-trip as strings in Drizzle; transform at the edge so
    // the rest of the handler never has to remember which is which.
    weightKg: z.coerce.number().min(0).max(1000).optional().transform((v) => (v == null ? undefined : String(v))),
    restSeconds: z.coerce.number().int().min(0).max(3600).optional(),
    durationSeconds: z.coerce.number().int().min(1).max(86400).optional(),
    intensity: z.enum(["light", "moderate", "vigorous"]).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((b) => !!b.exerciseId !== !!b.activityId, {
    message: "Give exactly one of exerciseId or activityId",
  });

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

/**
 * Rejects a prescription the member's logger could not render: a timed hold
 * has no rep count, and a rep exercise with no reps is an empty instruction.
 */
function assertLoggable(name: string, loggingMode: string, item: { reps?: number; durationSeconds?: number }) {
  if ((loggingMode === "hold" || loggingMode === "duration") && !item.durationSeconds) {
    throw badRequest(`"${name}" is a timed hold --- set durationSeconds, not reps`, "logging_mode_mismatch");
  }
  if (loggingMode === "reps" && !item.reps) {
    throw badRequest(`"${name}" is logged in reps --- set reps`, "logging_mode_mismatch");
  }
}

export const planRoutes: FastifyPluginAsync = async (app) => {
  const auth = (req: Parameters<typeof app.requireAuth>[0]) => app.requireAuth(req);
  const coachOnly = app.requireRole("coach", "admin");

  app.get("/plans", { preHandler: coachOnly }, async (req) => {
    const q = z
      .object({
        type: z.enum(["workout", "meal"]).optional(),
        templatesOnly: z.coerce.boolean().default(false),
      })
      .parse(req.query);

    const where = [eq(schema.plans.ownerCoachId, req.user!.id)];
    if (q.type) where.push(eq(schema.plans.type, q.type));
    if (q.templatesOnly) where.push(eq(schema.plans.isTemplate, true));

    const rows = await db
      .select({
        id: schema.plans.id,
        type: schema.plans.type,
        name: schema.plans.name,
        goal: schema.plans.goal,
        difficulty: schema.plans.difficulty,
        durationWeeks: schema.plans.durationWeeks,
        status: schema.plans.status,
        isTemplate: schema.plans.isTemplate,
        // Table names are written out literally here. Interpolating a drizzle
        // column into a raw sql`` template renders it UNQUALIFIED, so the
        // correlation becomes `WHERE plan_id = id` --- which resolves `id` to
        // the INNER table and silently counts zero instead of erroring.
        dayCount: sql<number>`(SELECT count(*)::int FROM plan_days pd WHERE pd.plan_id = plans.id)`,
        assignedCount: sql<number>`(
          SELECT count(*)::int FROM plan_assignments pa
          WHERE pa.plan_id = plans.id AND pa.status IN ('scheduled','active')
        )`,
      })
      .from(schema.plans)
      .where(and(...where))
      .orderBy(asc(schema.plans.name));
    return { items: rows };
  });

  app.post("/plans", { preHandler: coachOnly }, async (req, reply) => {
    const body = planBody.parse(req.body);
    const [plan] = await db.insert(schema.plans).values({ ...body, ownerCoachId: req.user!.id }).returning();
    reply.code(201);
    return { plan };
  });

  /**
   * Build a whole training block from a date range, in one call.
   *
   * A coach does not think in "week 2, day 3" --- they think "the 17th to the
   * 20th, football on Saturday". This takes the dated form of that and writes
   * the (week, day) form the plan tables store, so the programme stays reusable
   * while the coach never sees the coordinates.
   *
   * It is one transaction because a half-written block is worse than none: the
   * member would see Monday's session and nothing after it.
   */
  app.post("/plans/build", { preHandler: coachOnly }, async (req, reply) => {
    const item = z
      .object({
        exerciseId: z.string().uuid().optional(),
        activityId: z.string().uuid().optional(),
        sets: z.coerce.number().int().min(1).max(20).optional(),
        reps: z.coerce.number().int().min(1).max(500).optional(),
        weightKg: z.coerce.number().min(0).max(1000).optional(),
        restSeconds: z.coerce.number().int().min(0).max(3600).optional(),
        durationSeconds: z.coerce.number().int().min(1).max(86400).optional(),
        intensity: z.enum(["light", "moderate", "vigorous"]).optional(),
        notes: z.string().max(500).optional(),
      })
      .refine((i) => !!i.exerciseId !== !!i.activityId, {
        message: "Each item is either an exercise or an activity",
      });

    const body = z
      .object({
        planId: z.string().uuid().optional(),
        name: z.string().min(1).max(160),
        goal: z.string().max(200).optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
        startDate: isoDateString,
        endDate: isoDateString,
        memberIds: z.array(z.string().uuid()).max(100).default([]),
        /** Only dated days that carry work need to be sent; the rest are rest days. */
        days: z.array(z.object({ date: isoDateString, notes: z.string().max(1000).optional(), items: z.array(item).max(30).default([]) })).max(370),
        strategy: z.enum(["propagate", "fork", "detach"]).optional(),
      })
      .parse(req.body);

    const span = daysBetween(body.startDate, body.endDate);
    if (span < 0) throw badRequest("The end date is before the start date");
    if (span > 363) throw badRequest("A block can run for at most 52 weeks");
    for (const d of body.days) {
      const off = daysBetween(body.startDate, d.date);
      if (off < 0 || off > span) throw badRequest(`${d.date} is outside ${body.startDate} – ${body.endDate}`);
    }
    if (new Set(body.days.map((d) => d.date)).size !== body.days.length) {
      throw badRequest("The same date appears twice");
    }

    // Validate every prescription BEFORE writing anything, so a bad item on the
    // last day cannot leave the first three written.
    const exerciseIds = [...new Set(body.days.flatMap((d) => d.items.map((i) => i.exerciseId).filter(Boolean)))] as string[];
    const activityIds = [...new Set(body.days.flatMap((d) => d.items.map((i) => i.activityId).filter(Boolean)))] as string[];
    const [exRows, actRows] = await Promise.all([
      exerciseIds.length
        ? db.select({ id: schema.exercises.id, name: schema.exercises.name, loggingMode: schema.exercises.loggingMode })
            .from(schema.exercises).where(inArray(schema.exercises.id, exerciseIds))
        : Promise.resolve([]),
      activityIds.length
        ? db.select({ id: schema.activities.id, name: schema.activities.name })
            .from(schema.activities).where(inArray(schema.activities.id, activityIds))
        : Promise.resolve([]),
    ]);
    const exById = new Map(exRows.map((e) => [e.id, e]));
    const actById = new Map(actRows.map((a) => [a.id, a]));
    for (const day of body.days) {
      for (const i of day.items) {
        if (i.exerciseId) {
          const ex = exById.get(i.exerciseId);
          if (!ex) throw notFound("Exercise");
          assertLoggable(ex.name, ex.loggingMode, i);
        } else {
          const act = actById.get(i.activityId!);
          if (!act) throw notFound("Activity");
          if (!i.durationSeconds) throw badRequest(`"${act.name}" needs a duration`, "duration_required");
        }
      }
    }

    for (const memberId of body.memberIds) await assertCanReadMember(req.user!, memberId);

    // Rewriting a block that people are already following is the same decision
    // PATCH /plans/:id makes, and gets the same answer: ask rather than guess.
    let existing: { id: string; memberId: string | null; name: string }[] = [];
    if (body.planId) {
      await assertOwnsPlan(req.user!, body.planId);
      existing = await db
        .select({ id: schema.planAssignments.id, memberId: schema.planAssignments.memberId, name: schema.users.name })
        .from(schema.planAssignments)
        .innerJoin(schema.users, eq(schema.users.id, schema.planAssignments.memberId))
        .where(and(eq(schema.planAssignments.planId, body.planId), inArray(schema.planAssignments.status, ["scheduled", "active"])));
      if (existing.length > 0 && !body.strategy) {
        throw new ApiError(409, "plan_has_assignments", JSON.stringify({
          message: `${existing.length} member${existing.length === 1 ? " is" : "s are"} following this block`,
          members: existing.map((a) => ({ id: a.memberId, name: a.name })),
        }));
      }
    }

    const durationWeeks = Math.max(1, Math.ceil((span + 1) / 7));
    const withWork = new Map(body.days.map((d) => [d.date, d]));

    const result = await db.transaction(async (tx) => {
      let planId = body.planId;
      if (!planId || body.strategy === "fork") {
        const [p] = await tx
          .insert(schema.plans)
          .values({
            ownerCoachId: req.user!.id, type: "workout",
            name: body.strategy === "fork" ? `${body.name} (v2)` : body.name,
            goal: body.goal, difficulty: body.difficulty, durationWeeks, status: "published",
          })
          .returning();
        planId = p!.id;
      } else {
        await tx.update(schema.plans)
          .set({ name: body.name, goal: body.goal, difficulty: body.difficulty, durationWeeks, updatedAt: new Date() })
          .where(eq(schema.plans.id, planId));
        // The range may have moved; the old days no longer line up with it.
        await tx.delete(schema.planDays).where(eq(schema.planDays.planId, planId));
      }

      // Every date in the range gets a day, so a rest day is a real row the
      // calendar can show rather than an absence it has to infer.
      for (let offset = 0; offset <= span; offset++) {
        const date = new Date(Date.parse(`${body.startDate}T00:00:00.000Z`) + offset * 86_400_000);
        const key = date.toISOString().slice(0, 10);
        const spec = withWork.get(key);
        const { weekNumber, dayNumber } = dayCoordsForOffset(offset);
        const [dayRow] = await tx
          .insert(schema.planDays)
          .values({
            planId: planId!, weekNumber, dayNumber,
            title: date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }),
            isRestDay: !spec || spec.items.length === 0,
            notes: spec?.notes,
          })
          .returning();

        if (spec?.items.length) {
          await tx.insert(schema.planExercises).values(
            spec.items.map((i, position) => ({
              planDayId: dayRow!.id, position,
              exerciseId: i.exerciseId ?? null, activityId: i.activityId ?? null,
              sets: i.sets ?? null, reps: i.reps ?? null,
              weightKg: i.weightKg == null ? null : String(i.weightKg),
              restSeconds: i.restSeconds ?? null, durationSeconds: i.durationSeconds ?? null,
              intensity: i.intensity ?? null, notes: i.notes ?? null,
            })),
          );
        }
      }

      if (body.strategy === "detach" && existing.length > 0) {
        await tx.update(schema.planAssignments)
          .set({ status: "cancelled", endDate: new Date().toISOString().slice(0, 10) })
          .where(inArray(schema.planAssignments.id, existing.map((a) => a.id)));
      }

      // Re-window the people already on it; a rebuilt block that still points
      // at the old dates would put the work on the wrong days.
      if (body.strategy === "propagate" && existing.length > 0) {
        await tx.update(schema.planAssignments)
          .set({ startDate: body.startDate, endDate: body.endDate })
          .where(inArray(schema.planAssignments.id, existing.map((a) => a.id)));
      }

      const alreadyOn = new Set(
        body.strategy === "propagate" ? existing.map((a) => a.memberId).filter(Boolean) as string[] : [],
      );
      const toAssign = body.memberIds.filter((m) => !alreadyOn.has(m));
      const assignments = toAssign.length
        ? await tx
            .insert(schema.planAssignments)
            .values(toAssign.map((memberId) => ({
              planId: planId!, memberId, assignedBy: req.user!.id,
              startDate: body.startDate, endDate: body.endDate, status: "scheduled" as const,
            })))
            .returning()
        : [];

      return { planId: planId!, assignments };
    });

    await Promise.all(
      body.memberIds.map((m) =>
        notify(m, "plan_assigned", "New training block",
          `Your coach assigned "${body.name}", ${body.startDate} to ${body.endDate}`, { planId: result.planId, type: "workout" }),
      ),
    );

    const plan = await db.query.plans.findFirst({ where: eq(schema.plans.id, result.planId) });
    reply.code(201);
    return { plan, assignments: result.assignments, days: span + 1 };
  });

  /** Full plan tree: days, each with its exercises and meals resolved. */
  app.get("/plans/:id", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const plan = await db.query.plans.findFirst({ where: eq(schema.plans.id, id) });
    if (!plan) throw notFound("Plan");

    // Readable by the owner, or by a member it is assigned to.
    if (plan.ownerCoachId !== req.user!.id && req.user!.role !== "admin") {
      const assigned = await db.query.planAssignments.findFirst({
        where: and(eq(schema.planAssignments.planId, id), eq(schema.planAssignments.memberId, req.user!.id)),
      });
      if (!assigned) throw notFound("Plan");
    }

    const days = await db
      .select()
      .from(schema.planDays)
      .where(eq(schema.planDays.planId, id))
      .orderBy(asc(schema.planDays.weekNumber), asc(schema.planDays.dayNumber));

    const dayIds = days.map((d) => d.id);
    const [exercises, meals] = dayIds.length
      ? await Promise.all([
          db
            .select({
              id: schema.planExercises.id,
              planDayId: schema.planExercises.planDayId,
              position: schema.planExercises.position,
              sets: schema.planExercises.sets,
              reps: schema.planExercises.reps,
              weightKg: schema.planExercises.weightKg,
              restSeconds: schema.planExercises.restSeconds,
              durationSeconds: schema.planExercises.durationSeconds,
              intensity: schema.planExercises.intensity,
              notes: schema.planExercises.notes,
              exercise: {
                id: schema.exercises.id,
                slug: schema.exercises.slug,
                name: schema.exercises.name,
                discipline: schema.exercises.discipline,
                loggingMode: schema.exercises.loggingMode,
                equipment: schema.exercises.equipment,
                imageUrl: schema.exercises.imageUrl,
              },
              // Left-joined: an item is an exercise OR an activity, so exactly
              // one of these two comes back populated.
              activity: {
                id: schema.activities.id,
                slug: schema.activities.slug,
                name: schema.activities.name,
                group: schema.activities.group,
                met: schema.activities.met,
              },
            })
            .from(schema.planExercises)
            .leftJoin(schema.exercises, eq(schema.exercises.id, schema.planExercises.exerciseId))
            .leftJoin(schema.activities, eq(schema.activities.id, schema.planExercises.activityId))
            .where(inArray(schema.planExercises.planDayId, dayIds))
            .orderBy(asc(schema.planExercises.position)),
          db
            .select({
              id: schema.planMeals.id,
              planDayId: schema.planMeals.planDayId,
              mealType: schema.planMeals.mealType,
              position: schema.planMeals.position,
              servings: schema.planMeals.servings,
              meal: {
                id: schema.meals.id,
                slug: schema.meals.slug,
                name: schema.meals.name,
                calories: schema.meals.calories,
                proteinG: schema.meals.proteinG,
                carbsG: schema.meals.carbsG,
                fatG: schema.meals.fatG,
                allergens: schema.meals.allergens,
              },
            })
            .from(schema.planMeals)
            .innerJoin(schema.meals, eq(schema.meals.id, schema.planMeals.mealId))
            .where(inArray(schema.planMeals.planDayId, dayIds))
            .orderBy(asc(schema.planMeals.position)),
        ])
      : [[], []];

    return {
      plan,
      days: days.map((d) => ({
        ...d,
        exercises: exercises.filter((e) => e.planDayId === d.id),
        meals: meals.filter((m) => m.planDayId === d.id),
      })),
    };
  });

  app.post("/plans/:id/days", { preHandler: coachOnly }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await assertOwnsPlan(req.user!, id);
    const body = z
      .object({
        weekNumber: z.coerce.number().int().min(1).default(1),
        dayNumber: z.coerce.number().int().min(1).max(7),
        title: z.string().max(160).optional(),
        isRestDay: z.boolean().default(false),
        notes: z.string().max(1000).optional(),
      })
      .parse(req.body);
    const [day] = await db.insert(schema.planDays).values({ planId: id, ...body }).returning();
    reply.code(201);
    return { day };
  });

  app.post("/plan-days/:dayId/exercises", { preHandler: coachOnly }, async (req, reply) => {
    const { dayId } = z.object({ dayId: z.string().uuid() }).parse(req.params);
    const body = planExerciseBody.parse(req.body);

    const day = await db.query.planDays.findFirst({ where: eq(schema.planDays.id, dayId) });
    if (!day) throw notFound("Plan day");
    await assertOwnsPlan(req.user!, day.planId);

    if (body.exerciseId) {
      const exercise = await db.query.exercises.findFirst({ where: eq(schema.exercises.id, body.exerciseId) });
      if (!exercise) throw notFound("Exercise");
      assertLoggable(exercise.name, exercise.loggingMode, body);
    } else {
      const activity = await db.query.activities.findFirst({ where: eq(schema.activities.id, body.activityId!) });
      if (!activity) throw notFound("Activity");
      // A bout with no duration is not a prescription, it is a noun.
      if (!body.durationSeconds) throw badRequest(`"${activity.name}" needs a duration`, "duration_required");
    }

    // Adding real work to a day retires its rest-day marker, so the calendar
    // cannot say "Rest" over a session the coach just wrote.
    if (day.isRestDay) {
      await db.update(schema.planDays).set({ isRestDay: false }).where(eq(schema.planDays.id, dayId));
    }

    const [row] = await db.insert(schema.planExercises).values({ planDayId: dayId, ...body }).returning();
    reply.code(201);
    return { planExercise: row };
  });

  app.post("/plan-days/:dayId/meals", { preHandler: coachOnly }, async (req, reply) => {
    const { dayId } = z.object({ dayId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        mealId: z.string().uuid(),
        mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        position: z.coerce.number().int().min(0).default(0),
        servings: z.coerce.number().min(0.1).max(20).default(1),
        notes: z.string().max(500).optional(),
      })
      .parse(req.body);

    const day = await db.query.planDays.findFirst({ where: eq(schema.planDays.id, dayId) });
    if (!day) throw notFound("Plan day");
    await assertOwnsPlan(req.user!, day.planId);

    const [row] = await db
      .insert(schema.planMeals)
      .values({ planDayId: dayId, ...body, servings: String(body.servings) })
      .returning();
    reply.code(201);
    return { planMeal: row };
  });

  /** Assign a plan to a member. */
  app.post("/plans/:id/assign", { preHandler: coachOnly }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await assertOwnsPlan(req.user!, id);
    const body = z
      .object({
        memberId: z.string().uuid(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        repeats: z.enum(["once", "daily", "weekly", "biweekly", "monthly"]).default("once"),
      })
      .parse(req.body);

    // A coach may only assign to their own members.
    await assertCanReadMember(req.user!, body.memberId);

    const [assignment] = await db
      .insert(schema.planAssignments)
      .values({ planId: id, ...body, assignedBy: req.user!.id, status: "scheduled" })
      .returning();

    const plan = await db.query.plans.findFirst({ where: eq(schema.plans.id, id) });
    await notify(
      body.memberId,
      "plan_assigned",
      plan?.type === "meal" ? "New meal plan" : "New training plan",
      `Your coach assigned "${plan?.name}", starting ${body.startDate}`,
      { planId: id, assignmentId: assignment!.id, type: plan?.type },
    );

    reply.code(201);
    return { assignment };
  });


  /** Who is currently on this plan --- the client needs this BEFORE editing. */
  app.get("/plans/:id/assignments", { preHandler: coachOnly }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await assertOwnsPlan(req.user!, id);
    const rows = await db
      .select({
        id: schema.planAssignments.id,
        startDate: schema.planAssignments.startDate,
        endDate: schema.planAssignments.endDate,
        status: schema.planAssignments.status,
        member: { id: schema.users.id, name: schema.users.name, avatarUrl: schema.users.avatarUrl },
      })
      .from(schema.planAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.planAssignments.memberId))
      .where(and(eq(schema.planAssignments.planId, id), inArray(schema.planAssignments.status, ["scheduled", "active"])));
    return { items: rows, count: rows.length };
  });

  /**
   * Edit a plan that may already be assigned.
   *
   * A plan is not private once it is on someone's phone, so an edit is a
   * decision about THEM, not just about the document. `strategy` makes that
   * decision explicit rather than guessing:
   *
   *   propagate - change it for everyone already on it. Right for a typo or a
   *               correction that should reach people mid-programme.
   *   fork      - copy the plan with the changes and leave existing members on
   *               the original untouched. Right for "v2 for the next intake".
   *   detach    - change it AND end the current assignments, so nobody is
   *               following a plan that moved under them.
   *
   * The endpoint refuses to guess: if the plan has assignments and no strategy
   * is given, it returns 409 with the affected members so the client can ask.
   */
  app.patch("/plans/:id", { preHandler: coachOnly }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        name: z.string().min(1).max(160).optional(),
        goal: z.string().max(200).optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
        durationWeeks: z.coerce.number().int().min(1).max(52).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        isTemplate: z.boolean().optional(),
        strategy: z.enum(["propagate", "fork", "detach"]).optional(),
      })
      .parse(req.body);

    const plan = await assertOwnsPlan(req.user!, id);
    const assigned = await db
      .select({
        id: schema.planAssignments.id,
        memberId: schema.planAssignments.memberId,
        startDate: schema.planAssignments.startDate,
        name: schema.users.name,
      })
      .from(schema.planAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.planAssignments.memberId))
      .where(and(eq(schema.planAssignments.planId, id), inArray(schema.planAssignments.status, ["scheduled", "active"])));

    const { strategy, ...changes } = body;

    if (assigned.length > 0 && !strategy) {
      throw new ApiError(409, "plan_has_assignments", JSON.stringify({
        message: `${assigned.length} member${assigned.length === 1 ? " is" : "s are"} following this plan`,
        members: assigned.map((a) => ({ id: a.memberId, name: a.name })),
      }));
    }

    if (strategy === "fork") {
      // Deep copy: plan, days, and every exercise and meal on them. The
      // original keeps its assignments; the copy starts with none.
      const copy = await db.transaction(async (tx) => {
        const [newPlan] = await tx
          .insert(schema.plans)
          .values({
            ownerCoachId: req.user!.id, gymId: plan!.gymId, type: plan!.type,
            name: changes.name ?? `${plan!.name} (v2)`,
            goal: changes.goal ?? plan!.goal,
            difficulty: changes.difficulty ?? plan!.difficulty,
            durationWeeks: changes.durationWeeks ?? plan!.durationWeeks,
            status: "draft", isTemplate: changes.isTemplate ?? false,
          })
          .returning();

        const days = await tx.select().from(schema.planDays).where(eq(schema.planDays.planId, id));
        for (const day of days) {
          const [newDay] = await tx
            .insert(schema.planDays)
            .values({
              planId: newPlan!.id, weekNumber: day.weekNumber, dayNumber: day.dayNumber,
              title: day.title, isRestDay: day.isRestDay, notes: day.notes,
            })
            .returning();

          const [exs, mls] = await Promise.all([
            tx.select().from(schema.planExercises).where(eq(schema.planExercises.planDayId, day.id)),
            tx.select().from(schema.planMeals).where(eq(schema.planMeals.planDayId, day.id)),
          ]);
          if (exs.length) {
            await tx.insert(schema.planExercises).values(
              exs.map((e) => ({
                planDayId: newDay!.id, exerciseId: e.exerciseId, activityId: e.activityId,
                position: e.position, sets: e.sets, reps: e.reps, weightKg: e.weightKg,
                restSeconds: e.restSeconds, durationSeconds: e.durationSeconds,
                intensity: e.intensity, notes: e.notes,
              })),
            );
          }
          if (mls.length) {
            await tx.insert(schema.planMeals).values(
              mls.map((m) => ({
                planDayId: newDay!.id, mealId: m.mealId, mealType: m.mealType,
                position: m.position, servings: m.servings, notes: m.notes,
              })),
            );
          }
        }
        return newPlan!;
      });
      return { plan: copy, strategy: "fork", forkedFrom: id, assignmentsMoved: 0 };
    }

    const [updated] = await db
      .update(schema.plans)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(schema.plans.id, id))
      .returning();

    if (strategy === "detach" && assigned.length > 0) {
      await db
        .update(schema.planAssignments)
        .set({ status: "cancelled", endDate: new Date().toISOString().slice(0, 10) })
        .where(inArray(schema.planAssignments.id, assigned.map((a) => a.id)));

      await Promise.all(
        assigned
          .filter((a): a is typeof a & { memberId: string } => a.memberId !== null)
          .map((a) => notify(a.memberId, "plan_assigned", "A plan was withdrawn", `"${plan!.name}" is no longer assigned to you`, { planId: id })),
      );
    }

    if (strategy === "propagate" && assigned.length > 0) {
      await Promise.all(
        assigned
          .filter((a): a is typeof a & { memberId: string } => a.memberId !== null)
          .map((a) => notify(a.memberId, "plan_assigned", "Your plan was updated", `Your coach changed "${updated!.name}"`, { planId: id })),
      );
    }

    return {
      plan: updated,
      strategy: strategy ?? "none",
      affected: strategy === "detach" || strategy === "propagate" ? assigned.length : 0,
    };
  });

  /** Save an existing plan into the coach's template library. */
  app.post("/plans/:id/save-as-template", { preHandler: coachOnly }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { name } = z.object({ name: z.string().min(1).max(160).optional() }).parse(req.body ?? {});
    const plan = await assertOwnsPlan(req.user!, id);

    // A template is a separate row, so editing the working plan later cannot
    // silently rewrite what the library offers.
    const template = await db.transaction(async (tx) => {
      const [t] = await tx
        .insert(schema.plans)
        .values({
          ownerCoachId: req.user!.id, gymId: plan!.gymId, type: plan!.type,
          name: name ?? plan!.name, goal: plan!.goal, difficulty: plan!.difficulty,
          durationWeeks: plan!.durationWeeks, status: "published", isTemplate: true,
        })
        .returning();

      const days = await tx.select().from(schema.planDays).where(eq(schema.planDays.planId, id));
      for (const day of days) {
        const [newDay] = await tx
          .insert(schema.planDays)
          .values({ planId: t!.id, weekNumber: day.weekNumber, dayNumber: day.dayNumber, title: day.title, isRestDay: day.isRestDay, notes: day.notes })
          .returning();
        const [exs, mls] = await Promise.all([
          tx.select().from(schema.planExercises).where(eq(schema.planExercises.planDayId, day.id)),
          tx.select().from(schema.planMeals).where(eq(schema.planMeals.planDayId, day.id)),
        ]);
        if (exs.length) await tx.insert(schema.planExercises).values(exs.map((e) => ({ planDayId: newDay!.id, exerciseId: e.exerciseId, activityId: e.activityId, position: e.position, sets: e.sets, reps: e.reps, weightKg: e.weightKg, restSeconds: e.restSeconds, durationSeconds: e.durationSeconds, intensity: e.intensity, notes: e.notes })));
        if (mls.length) await tx.insert(schema.planMeals).values(mls.map((m) => ({ planDayId: newDay!.id, mealId: m.mealId, mealType: m.mealType, position: m.position, servings: m.servings, notes: m.notes })));
      }
      return t!;
    });

    reply.code(201);
    return { template };
  });

  /** Start a working plan from a template, leaving the template untouched. */
  app.post("/plans/:id/use-template", { preHandler: coachOnly }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { name } = z.object({ name: z.string().min(1).max(160).optional() }).parse(req.body ?? {});
    const source = await db.query.plans.findFirst({ where: eq(schema.plans.id, id) });
    if (!source) throw notFound("Template");
    if (source.ownerCoachId !== req.user!.id && req.user!.role !== "admin") throw notFound("Template");

    const copy = await db.transaction(async (tx) => {
      const [p] = await tx
        .insert(schema.plans)
        .values({
          ownerCoachId: req.user!.id, gymId: source.gymId, type: source.type,
          name: name ?? source.name, goal: source.goal, difficulty: source.difficulty,
          durationWeeks: source.durationWeeks, status: "draft", isTemplate: false,
        })
        .returning();
      const days = await tx.select().from(schema.planDays).where(eq(schema.planDays.planId, id));
      for (const day of days) {
        const [d] = await tx.insert(schema.planDays).values({ planId: p!.id, weekNumber: day.weekNumber, dayNumber: day.dayNumber, title: day.title, isRestDay: day.isRestDay, notes: day.notes }).returning();
        const [exs, mls] = await Promise.all([
          tx.select().from(schema.planExercises).where(eq(schema.planExercises.planDayId, day.id)),
          tx.select().from(schema.planMeals).where(eq(schema.planMeals.planDayId, day.id)),
        ]);
        if (exs.length) await tx.insert(schema.planExercises).values(exs.map((e) => ({ planDayId: d!.id, exerciseId: e.exerciseId, activityId: e.activityId, position: e.position, sets: e.sets, reps: e.reps, weightKg: e.weightKg, restSeconds: e.restSeconds, durationSeconds: e.durationSeconds, intensity: e.intensity, notes: e.notes })));
        if (mls.length) await tx.insert(schema.planMeals).values(mls.map((m) => ({ planDayId: d!.id, mealId: m.mealId, mealType: m.mealType, position: m.position, servings: m.servings, notes: m.notes })));
      }
      return p!;
    });
    reply.code(201);
    return { plan: copy, fromTemplate: id };
  });

  /** Assign one plan to several members at once, as the design's Assign screen does. */
  app.post("/plans/:id/assign-many", { preHandler: coachOnly }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await assertOwnsPlan(req.user!, id);
    const body = z
      .object({
        memberIds: z.array(z.string().uuid()).min(1).max(100),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        repeats: z.enum(["once", "daily", "weekly", "biweekly", "monthly"]).default("once"),
      })
      .parse(req.body);

    for (const memberId of body.memberIds) await assertCanReadMember(req.user!, memberId);
    const plan = await db.query.plans.findFirst({ where: eq(schema.plans.id, id) });

    const rows = await db
      .insert(schema.planAssignments)
      .values(
        body.memberIds.map((memberId) => ({
          planId: id, memberId, assignedBy: req.user!.id, status: "scheduled" as const,
          startDate: body.startDate, endDate: body.endDate ?? null, repeats: body.repeats,
        })),
      )
      .returning();

    await Promise.all(
      body.memberIds.map((m) =>
        notify(m, "plan_assigned", plan?.type === "meal" ? "New meal plan" : "New training plan",
          `Your coach assigned "${plan?.name}", starting ${body.startDate}`, { planId: id }),
      ),
    );

    reply.code(201);
    return { assignments: rows, count: rows.length };
  });

  /** What a member has been assigned. Coaches may query one of their members. */
  app.get("/assignments", { preHandler: auth }, async (req) => {
    const q = z.object({ memberId: z.string().uuid().optional() }).parse(req.query);
    const memberId = q.memberId ?? req.user!.id;
    await assertCanReadMember(req.user!, memberId);

    const rows = await db
      .select({
        id: schema.planAssignments.id,
        startDate: schema.planAssignments.startDate,
        endDate: schema.planAssignments.endDate,
        repeats: schema.planAssignments.repeats,
        status: schema.planAssignments.status,
        plan: {
          id: schema.plans.id,
          name: schema.plans.name,
          type: schema.plans.type,
          goal: schema.plans.goal,
          difficulty: schema.plans.difficulty,
          durationWeeks: schema.plans.durationWeeks,
        },
      })
      .from(schema.planAssignments)
      .innerJoin(schema.plans, eq(schema.plans.id, schema.planAssignments.planId))
      .where(
        and(
          eq(schema.planAssignments.memberId, memberId),
          or(eq(schema.planAssignments.status, "scheduled"), eq(schema.planAssignments.status, "active"))!,
        ),
      )
      .orderBy(asc(schema.planAssignments.startDate));
    return { items: rows };
  });
};
