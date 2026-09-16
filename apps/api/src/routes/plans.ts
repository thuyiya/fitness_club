import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { badRequest, notFound } from "../errors.js";
import { assertCanReadMember, assertOwnsPlan } from "../lib/access.js";
import { notify } from "../lib/notify.js";

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
const planExerciseBody = z.object({
  exerciseId: z.string().uuid(),
  position: z.coerce.number().int().min(0).default(0),
  sets: z.coerce.number().int().min(1).max(20).optional(),
  reps: z.coerce.number().int().min(1).max(500).optional(),
  // numeric columns round-trip as strings in Drizzle; transform at the edge so
  // the rest of the handler never has to remember which is which.
  weightKg: z.coerce.number().min(0).max(1000).optional().transform((v) => (v == null ? undefined : String(v))),
  restSeconds: z.coerce.number().int().min(0).max(3600).optional(),
  durationSeconds: z.coerce.number().int().min(1).max(86400).optional(),
  notes: z.string().max(500).optional(),
});

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
        dayCount: sql<number>`(SELECT count(*)::int FROM ${schema.planDays} WHERE ${schema.planDays.planId} = ${schema.plans.id})`,
        assignedCount: sql<number>`(
          SELECT count(*)::int FROM ${schema.planAssignments}
          WHERE ${schema.planAssignments.planId} = ${schema.plans.id}
            AND ${schema.planAssignments.status} IN ('scheduled','active')
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
            })
            .from(schema.planExercises)
            .innerJoin(schema.exercises, eq(schema.exercises.id, schema.planExercises.exerciseId))
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

    const exercise = await db.query.exercises.findFirst({ where: eq(schema.exercises.id, body.exerciseId) });
    if (!exercise) throw notFound("Exercise");

    // Catch the prescription that cannot be logged: a hold needs seconds, not
    // reps, and the member's logger renders fields from loggingMode.
    if (exercise.loggingMode === "hold" && !body.durationSeconds) {
      throw badRequest(`"${exercise.name}" is a timed hold --- set durationSeconds, not reps`, "logging_mode_mismatch");
    }
    if (exercise.loggingMode === "reps" && !body.reps) {
      throw badRequest(`"${exercise.name}" is logged in reps --- set reps`, "logging_mode_mismatch");
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
