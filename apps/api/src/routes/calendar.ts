import { and, asc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { badRequest, forbidden, notFound } from "../errors.js";
import { assertCanReadMember, coachRoster } from "../lib/access.js";
import { notify } from "../lib/notify.js";
import { planDayMatchesDate } from "../lib/planDay.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const calendarRoutes: FastifyPluginAsync = async (app) => {
  const auth = (req: Parameters<typeof app.requireAuth>[0]) => app.requireAuth(req);
  const coachOnly = app.requireRole("coach", "admin");

  /**
   * The timeline calendar.
   *
   * A coach sees every appointment they hold across all members; a member sees
   * their own. Appointments come back with real start and end times so the
   * client can lay them out against an hour axis and show the gaps --- which is
   * the point of a timeline rather than a list.
   */
  app.get("/calendar", { preHandler: auth }, async (req) => {
    const { from, to, memberId } = z
      .object({ from: isoDate, to: isoDate, memberId: z.string().uuid().optional() })
      .parse(req.query);

    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T23:59:59.999Z`);
    if (end < start) throw badRequest("`to` is before `from`");

    const viewingAsCoach = req.user!.role !== "member" && !memberId;
    if (memberId) await assertCanReadMember(req.user!, memberId);

    const who = viewingAsCoach
      ? eq(schema.appointments.coachId, req.user!.id)
      : eq(schema.appointments.memberId, memberId ?? req.user!.id);

    const rows = await db
      .select({
        id: schema.appointments.id,
        kind: schema.appointments.kind,
        title: schema.appointments.title,
        notes: schema.appointments.notes,
        location: schema.appointments.location,
        startsAt: schema.appointments.startsAt,
        endsAt: schema.appointments.endsAt,
        status: schema.appointments.status,
        member: { id: schema.users.id, name: schema.users.name, avatarUrl: schema.users.avatarUrl },
      })
      .from(schema.appointments)
      .leftJoin(schema.users, eq(schema.users.id, schema.appointments.memberId))
      .where(and(who, gte(schema.appointments.startsAt, start), lte(schema.appointments.startsAt, end)))
      .orderBy(asc(schema.appointments.startsAt));

    // Plan windows overlapping the range, so the calendar can mark which days
    // carry prescribed work even when nothing is booked.
    const planWindows = await db
      .select({
        id: schema.planAssignments.id,
        startDate: schema.planAssignments.startDate,
        endDate: schema.planAssignments.endDate,
        planName: schema.plans.name,
        planType: schema.plans.type,
        memberId: schema.planAssignments.memberId,
      })
      .from(schema.planAssignments)
      .innerJoin(schema.plans, eq(schema.plans.id, schema.planAssignments.planId))
      .where(
        and(
          viewingAsCoach
            ? eq(schema.planAssignments.assignedBy, req.user!.id)
            : eq(schema.planAssignments.memberId, memberId ?? req.user!.id),
          lte(schema.planAssignments.startDate, to),
          or(isNull(schema.planAssignments.endDate), gte(schema.planAssignments.endDate, from))!,
          inArray(schema.planAssignments.status, ["scheduled", "active"]),
        ),
      );

    /**
     * The prescribed work itself, date by date.
     *
     * A plan window tells you a block is running; it does not tell you that
     * Saturday is football and Sunday is rest. The coach who wrote the block
     * needs to see it on their own calendar, and so does the member --- it is
     * the same rows, read from either end of the assignment.
     *
     * generate_series gives one row per date so the (week, day) coordinates can
     * be resolved per date in one round trip. Aliases are written literally: a
     * drizzle column interpolated into raw sql`` renders unqualified and would
     * silently bind to the wrong table in a join this wide.
     */
    const subjectId = viewingAsCoach ? req.user!.id : (memberId ?? req.user!.id);
    const whoClause = viewingAsCoach ? sql`pa.assigned_by = ${subjectId}` : sql`pa.member_id = ${subjectId}`;
    const planned = await db.execute<{
      date: string; member_id: string; member_name: string; plan_id: string; plan_name: string;
      is_rest_day: boolean; item_name: string | null; sets: number | null; reps: number | null;
      duration_seconds: number | null; intensity: string | null; is_activity: boolean | null;
    }>(sql`
      SELECT gs.d::date::text AS date,
             pa.member_id, u.name AS member_name,
             p.id AS plan_id, p.name AS plan_name,
             pd.is_rest_day,
             COALESCE(e.name, a.name) AS item_name,
             pe.sets, pe.reps, pe.duration_seconds, pe.intensity::text AS intensity,
             (pe.activity_id IS NOT NULL) AS is_activity
      FROM generate_series(${from}::date, ${to}::date, interval '1 day') AS gs(d)
      JOIN plan_assignments pa
        ON pa.start_date <= gs.d
       AND (pa.end_date IS NULL OR pa.end_date >= gs.d)
       AND pa.status IN ('scheduled','active')
       AND ${whoClause}
      JOIN users u ON u.id = pa.member_id
      JOIN plans p ON p.id = pa.plan_id AND p.type = 'workout'
      JOIN plan_days pd
        ON pd.plan_id = p.id
       AND pd.day_number = ((gs.d::date - pa.start_date)::int % 7) + 1
       AND pd.week_number = (
             ((gs.d::date - pa.start_date)::int / 7)
             % (SELECT GREATEST(MAX(pd_span.week_number), 1) FROM plan_days pd_span WHERE pd_span.plan_id = p.id)
           ) + 1
      LEFT JOIN plan_exercises pe ON pe.plan_day_id = pd.id
      LEFT JOIN exercises e ON e.id = pe.exercise_id
      LEFT JOIN activities a ON a.id = pe.activity_id
      ORDER BY gs.d, u.name, pe.position NULLS FIRST
    `);

    type PlannedDay = {
      date: string; memberId: string; memberName: string; planId: string; planName: string;
      isRestDay: boolean;
      items: { name: string; sets: number | null; reps: number | null; durationSeconds: number | null; intensity: string | null; isActivity: boolean }[];
    };
    const byDay = new Map<string, PlannedDay>();
    for (const r of planned) {
      const key = `${r.date}:${r.member_id}:${r.plan_id}`;
      const entry = byDay.get(key) ?? {
        date: r.date, memberId: r.member_id, memberName: r.member_name,
        planId: r.plan_id, planName: r.plan_name, isRestDay: r.is_rest_day, items: [],
      };
      if (r.item_name) {
        entry.items.push({
          name: r.item_name, sets: r.sets, reps: r.reps,
          durationSeconds: r.duration_seconds, intensity: r.intensity, isActivity: !!r.is_activity,
        });
      }
      byDay.set(key, entry);
    }

    return { from, to, appointments: rows, planWindows, plannedWork: [...byDay.values()] };
  });


  /**
   * One day for a member: booked sessions plus the SLOTS their plans prescribe.
   *
   * A calendar that only shows appointments is nearly empty for most members --
   * they have one session a week and eat four times a day. The prescribed meals
   * and exercises are what actually fill the day, so they belong here, marked
   * as planned rather than booked.
   */
  app.get("/calendar/day", { preHandler: auth }, async (req) => {
    const { date, memberId } = z
      .object({ date: isoDate, memberId: z.string().uuid().optional() })
      .parse(req.query);
    const member = memberId ?? req.user!.id;
    await assertCanReadMember(req.user!, member);

    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    // Plans whose window covers this date, narrowed to the ONE day of each
    // plan that falls on it --- see lib/planDay.ts.
    const active = and(
      eq(schema.planAssignments.memberId, member),
      lte(schema.planAssignments.startDate, date),
      or(isNull(schema.planAssignments.endDate), gte(schema.planAssignments.endDate, date))!,
      inArray(schema.planAssignments.status, ["scheduled", "active"]),
      planDayMatchesDate(date),
    );

    const [appointments, exercises, activities, meals] = await Promise.all([
      db
        .select({
          id: schema.appointments.id, kind: schema.appointments.kind, title: schema.appointments.title,
          location: schema.appointments.location, startsAt: schema.appointments.startsAt,
          endsAt: schema.appointments.endsAt, status: schema.appointments.status,
        })
        .from(schema.appointments)
        .where(and(eq(schema.appointments.memberId, member), gte(schema.appointments.startsAt, start), lte(schema.appointments.startsAt, end))),
      db
        .select({
          id: schema.planExercises.id, planName: schema.plans.name, position: schema.planExercises.position,
          sets: schema.planExercises.sets, reps: schema.planExercises.reps,
          durationSeconds: schema.planExercises.durationSeconds, restSeconds: schema.planExercises.restSeconds,
          name: schema.exercises.name, loggingMode: schema.exercises.loggingMode,
          discipline: schema.exercises.discipline, dayTitle: schema.planDays.title,
        })
        .from(schema.planAssignments)
        .innerJoin(schema.plans, eq(schema.plans.id, schema.planAssignments.planId))
        .innerJoin(schema.planDays, eq(schema.planDays.planId, schema.plans.id))
        .innerJoin(schema.planExercises, eq(schema.planExercises.planDayId, schema.planDays.id))
        .innerJoin(schema.exercises, eq(schema.exercises.id, schema.planExercises.exerciseId))
        .where(active)
        .orderBy(asc(schema.planExercises.position)),
      db
        .select({
          id: schema.planExercises.id, planName: schema.plans.name, position: schema.planExercises.position,
          durationSeconds: schema.planExercises.durationSeconds, intensity: schema.planExercises.intensity,
          notes: schema.planExercises.notes, dayTitle: schema.planDays.title,
          name: schema.activities.name, group: schema.activities.group, met: schema.activities.met,
        })
        .from(schema.planAssignments)
        .innerJoin(schema.plans, eq(schema.plans.id, schema.planAssignments.planId))
        .innerJoin(schema.planDays, eq(schema.planDays.planId, schema.plans.id))
        .innerJoin(schema.planExercises, eq(schema.planExercises.planDayId, schema.planDays.id))
        .innerJoin(schema.activities, eq(schema.activities.id, schema.planExercises.activityId))
        .where(active)
        .orderBy(asc(schema.planExercises.position)),
      db
        .select({
          id: schema.planMeals.id, planName: schema.plans.name, mealType: schema.planMeals.mealType,
          position: schema.planMeals.position, servings: schema.planMeals.servings,
          name: schema.meals.name, calories: schema.meals.calories, proteinG: schema.meals.proteinG,
          carbsG: schema.meals.carbsG, fatG: schema.meals.fatG,
        })
        .from(schema.planAssignments)
        .innerJoin(schema.plans, eq(schema.plans.id, schema.planAssignments.planId))
        .innerJoin(schema.planDays, eq(schema.planDays.planId, schema.plans.id))
        .innerJoin(schema.planMeals, eq(schema.planMeals.planDayId, schema.planDays.id))
        .innerJoin(schema.meals, eq(schema.meals.id, schema.planMeals.mealId))
        .where(active)
        .orderBy(asc(schema.planMeals.position)),
    ]);

    // Typical times for each slot, so meal slots can be placed on the hour axis
    // alongside real bookings. A member who logs at a different time is not
    // wrong --- this only positions the PLAN.
    const SLOT_HOUR: Record<string, number> = { breakfast: 8, lunch: 13, dinner: 19, snack: 16 };

    return {
      date,
      appointments,
      mealSlots: meals.map((m) => ({ ...m, plannedHour: SLOT_HOUR[m.mealType ?? "snack"] ?? 12 })),
      exerciseSlots: exercises,
      /** Sports and other bouts prescribed for the day, logged by duration. */
      activitySlots: activities,
      // Exercises have no fixed hour: they belong to the session the member
      // books or chooses, so the client renders them as an unscheduled block.
      hasPlannedTraining: exercises.length > 0 || activities.length > 0,
    };
  });

  app.post("/appointments", { preHandler: coachOnly }, async (req, reply) => {
    const body = z
      .object({
        memberId: z.string().uuid().optional(),
        gymId: z.string().uuid().optional(),
        kind: z.enum(["training_session", "consultation", "assessment", "check_in"]).default("training_session"),
        title: z.string().min(1).max(160),
        notes: z.string().max(1000).optional(),
        location: z.string().max(200).optional(),
        startsAt: z.string().datetime(),
        endsAt: z.string().datetime(),
      })
      .parse(req.body);

    if (new Date(body.endsAt) <= new Date(body.startsAt)) throw badRequest("The end time must be after the start");
    if (body.memberId) await assertCanReadMember(req.user!, body.memberId);

    // Refuse a double-booking rather than letting the calendar show two
    // sessions in the same slot and leaving the coach to notice.
    const clash = await db
      .select({ id: schema.appointments.id, title: schema.appointments.title })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.coachId, req.user!.id),
          inArray(schema.appointments.status, ["scheduled", "confirmed"]),
          lte(schema.appointments.startsAt, new Date(body.endsAt)),
          gte(schema.appointments.endsAt, new Date(body.startsAt)),
        ),
      );
    if (clash.length) {
      throw badRequest(`That slot overlaps "${clash[0]!.title}"`, "appointment_conflict");
    }

    const [appointment] = await db
      .insert(schema.appointments)
      .values({
        ...body,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        coachId: req.user!.id,
        createdBy: req.user!.id,
      })
      .returning();

    if (body.memberId) {
      await notify(
        body.memberId,
        "session_reminder",
        "New session booked",
        `${body.title} — ${new Date(body.startsAt).toLocaleString()}`,
        { appointmentId: appointment!.id },
      );
    }
    reply.code(201);
    return { appointment };
  });

  app.patch("/appointments/:id", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]).optional(),
        notes: z.string().max(1000).optional(),
        startsAt: z.string().datetime().optional(),
        endsAt: z.string().datetime().optional(),
      })
      .parse(req.body);

    const existing = await db.query.appointments.findFirst({ where: eq(schema.appointments.id, id) });
    if (!existing) throw notFound("Appointment");

    // The coach owns the slot; the member may only confirm or cancel their own.
    const isCoach = existing.coachId === req.user!.id;
    const isMember = existing.memberId === req.user!.id;
    if (!isCoach && !isMember && req.user!.role !== "admin") throw notFound("Appointment");
    if (isMember && !isCoach && (body.startsAt || body.endsAt)) {
      throw forbidden("Only the coach can move an appointment");
    }

    const [updated] = await db
      .update(schema.appointments)
      .set({
        ...body,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.appointments.id, id))
      .returning();

    if (isMember && body.status && existing.coachId) {
      await notify(existing.coachId, "session_reminder", `Session ${body.status}`, `${existing.title} was ${body.status} by the member`, { appointmentId: id });
    }
    return { appointment: updated };
  });

  /** The coach's day at a glance: every booking, plus who is unbooked. */
  app.get("/coach/schedule", { preHandler: coachOnly }, async (req) => {
    const { date } = z.object({ date: isoDate }).parse(req.query);
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const [appointments, roster] = await Promise.all([
      db
        .select({
          id: schema.appointments.id,
          kind: schema.appointments.kind,
          title: schema.appointments.title,
          location: schema.appointments.location,
          startsAt: schema.appointments.startsAt,
          endsAt: schema.appointments.endsAt,
          status: schema.appointments.status,
          member: { id: schema.users.id, name: schema.users.name, avatarUrl: schema.users.avatarUrl },
        })
        .from(schema.appointments)
        .leftJoin(schema.users, eq(schema.users.id, schema.appointments.memberId))
        .where(and(eq(schema.appointments.coachId, req.user!.id), gte(schema.appointments.startsAt, start), lte(schema.appointments.startsAt, end)))
        .orderBy(asc(schema.appointments.startsAt)),
      coachRoster(req.user!.id),
    ]);

    const booked = new Set(appointments.map((a) => a.member?.id).filter(Boolean) as string[]);
    return {
      date,
      appointments,
      unbooked: roster.filter((m) => !booked.has(m.id)).map((m) => ({ id: m.id, name: m.name })),
    };
  });
};
