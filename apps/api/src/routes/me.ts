import { and, asc, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { badRequest, notFound } from "../errors.js";
import { assertCanReadMember } from "../lib/access.js";
import { hydrationTargetMl, macroTargets, tdee } from "../lib/nutrition.js";

const goalDirection = { fat_loss: "lose", muscle_gain: "gain", maintain: "maintain", recomposition: "lose", endurance: "gain", general_health: "maintain" } as const;

export const meRoutes: FastifyPluginAsync = async (app) => {
  const auth = (req: Parameters<typeof app.requireAuth>[0]) => app.requireAuth(req);

  app.patch("/me", { preHandler: auth }, async (req) => {
    const body = z
      .object({
        name: z.string().min(1).max(120).optional(),
        timezone: z.string().max(60).optional(),
        heightCm: z.coerce.number().min(50).max(260).transform(String).optional(),
        dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        sex: z.enum(["male", "female"]).optional(),
        activityLevel: z.enum(["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"]).optional(),
        goalType: z.enum(["fat_loss", "maintain", "muscle_gain", "recomposition", "endurance", "general_health"]).optional(),
        sportProfileId: z.string().uuid().nullable().optional(),
        bio: z.string().max(1000).optional(),
      })
      .parse(req.body);

    const [user] = await db
      .update(schema.users)
      .set({
        ...body,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, req.user!.id))
      .returning();
    if (!user) throw notFound("User");
    const { passwordHash, ...safe } = user;
    return { user: safe };
  });

  /**
   * The member's daily targets, computed rather than stored.
   *
   * Storing them would go stale the moment they log a new weight. The whole
   * chain is here: Mifflin-St Jeor BMR -> PAL multiplier -> goal delta ->
   * macros, where a sport of focus REPLACES the generic percentage split with
   * its own g/kg prescription.
   */
  app.get("/me/targets", { preHandler: auth }, async (req) => {
    const { memberId } = z.object({ memberId: z.string().uuid().optional() }).parse(req.query);
    const id = memberId ?? req.user!.id;
    await assertCanReadMember(req.user!, id);

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
    if (!user) throw notFound("User");

    const latest = await db.query.bodyMetrics.findFirst({
      where: eq(schema.bodyMetrics.memberId, id),
      orderBy: desc(schema.bodyMetrics.date),
    });

    const missing: string[] = [];
    if (!user.sex) missing.push("sex");
    if (!user.heightCm) missing.push("heightCm");
    if (!user.dateOfBirth) missing.push("dateOfBirth");
    if (!latest?.weightKg) missing.push("a logged weight");
    if (missing.length) {
      // Returned as data, not an error: the profile screen shows exactly what
      // is still needed rather than a blank number.
      return { ready: false, missing, targets: null };
    }

    const weightKg = Number(latest!.weightKg);
    const heightCm = Number(user.heightCm);
    const age = Math.floor((Date.now() - user.dateOfBirth!.getTime()) / 31_557_600_000);
    const activityLevel = user.activityLevel ?? "sedentary";

    const sport = user.sportProfileId
      ? await db.query.sportProfiles.findFirst({ where: eq(schema.sportProfiles.id, user.sportProfileId) })
      : null;

    const direction = goalDirection[user.goalType ?? "maintain"];
    const energy = tdee({ weightKg, heightCm, age, sex: user.sex!, activityLevel });

    const targets = macroTargets({
      tdeeKcal: energy,
      weightKg,
      goal: direction,
      goalType: user.goalType,
      sport: sport
        ? {
            carbsGPerKg: Number(direction === "lose" ? sport.carbsLose : direction === "gain" ? sport.carbsGain : sport.carbsMaintain),
            proteinGPerKg: Number(direction === "lose" ? sport.proteinLose : direction === "gain" ? sport.proteinGain : sport.proteinMaintain),
          }
        : null,
    });

    return {
      ready: true,
      basis: {
        weightKg, heightCm, age, sex: user.sex, activityLevel,
        goalType: user.goalType ?? "maintain",
        sportProfile: sport ? { id: sport.id, label: sport.label, type: sport.type } : null,
        tdeeKcal: Math.round(energy),
      },
      targets: { ...targets, hydrationMl: hydrationTargetMl(weightKg) },
    };
  });


  /**
   * What needs the member's attention right now: unread notes from their coach,
   * surveys waiting, plans just assigned, sessions booked today.
   *
   * This replaces the macro-gap strip that used to sit at the top of Home.
   * A member opens the app to find out what CHANGED, not to be told arithmetic
   * they can already see in the summary card below it.
   */
  app.get("/me/alerts", { preHandler: auth }, async (req) => {
    const me = req.user!.id;
    const today = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(`${today}T00:00:00.000Z`);
    const todayEnd = new Date(`${today}T23:59:59.999Z`);

    const [unread, surveys, assignments, sessions, coachLink] = await Promise.all([
      db
        .select({
          id: schema.notifications.id, kind: schema.notifications.kind,
          title: schema.notifications.title, body: schema.notifications.body,
          createdAt: schema.notifications.createdAt,
        })
        .from(schema.notifications)
        .where(and(eq(schema.notifications.userId, me), isNull(schema.notifications.readAt)))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(10),
      db
        .select({
          assignmentId: schema.surveyAssignments.id, dueDate: schema.surveyAssignments.dueDate,
          surveyId: schema.surveys.id, title: schema.surveys.title,
        })
        .from(schema.surveyAssignments)
        .innerJoin(schema.surveys, eq(schema.surveys.id, schema.surveyAssignments.surveyId))
        .where(eq(schema.surveyAssignments.memberId, me)),
      db
        .select({
          id: schema.planAssignments.id, startDate: schema.planAssignments.startDate,
          planName: schema.plans.name, planType: schema.plans.type, createdAt: schema.planAssignments.createdAt,
        })
        .from(schema.planAssignments)
        .innerJoin(schema.plans, eq(schema.plans.id, schema.planAssignments.planId))
        .where(and(eq(schema.planAssignments.memberId, me), inArray(schema.planAssignments.status, ["scheduled", "active"])))
        .orderBy(desc(schema.planAssignments.createdAt))
        .limit(5),
      db
        .select({
          id: schema.appointments.id, title: schema.appointments.title,
          startsAt: schema.appointments.startsAt, location: schema.appointments.location,
          status: schema.appointments.status,
        })
        .from(schema.appointments)
        .where(and(eq(schema.appointments.memberId, me), gte(schema.appointments.startsAt, todayStart), lte(schema.appointments.startsAt, todayEnd)))
        .orderBy(asc(schema.appointments.startsAt)),
      // An ACTIVE coach link, not merely a conversation --- a member who has
      // only enquired still needs the prompt to find a coach.
      db
        .select({
          coachId: schema.coachMembers.coachId,
          name: schema.users.name,
        })
        .from(schema.coachMembers)
        .innerJoin(schema.users, eq(schema.users.id, schema.coachMembers.coachId))
        .where(and(eq(schema.coachMembers.memberId, me), eq(schema.coachMembers.status, "active")))
        .limit(1),
    ]);

    // A survey counts as outstanding only if it has no response for this cycle.
    const surveyIds = surveys.map((s) => s.surveyId);
    const answered = surveyIds.length
      ? await db
          .select({ surveyId: schema.surveyResponses.surveyId, cycleDate: schema.surveyResponses.cycleDate })
          .from(schema.surveyResponses)
          .where(and(eq(schema.surveyResponses.memberId, me), inArray(schema.surveyResponses.surveyId, surveyIds)))
      : [];
    const done = new Set(answered.map((a) => a.surveyId));

    return {
      coach: coachLink[0] ?? null,
      hasCoach: coachLink.length > 0,
      unreadNotifications: unread,
      pendingSurveys: surveys.filter((s) => !done.has(s.surveyId)),
      recentAssignments: assignments,
      todaySessions: sessions,
      count: unread.length + surveys.filter((s) => !done.has(s.surveyId)).length + sessions.length,
    };
  });

  app.post("/me/password", { preHandler: auth }, async (req) => {
    const { currentPassword, newPassword } = z
      .object({ currentPassword: z.string(), newPassword: z.string().min(10) })
      .parse(req.body);

    const { hashPassword, verifyPassword } = await import("../auth/password.js");
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, req.user!.id) });
    if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
      throw badRequest("Current password is incorrect", "invalid_password");
    }

    await db.transaction(async (tx) => {
      await tx.update(schema.users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(schema.users.id, user.id));
      // A password change ends every other session; that is the point of it.
      await tx.update(schema.refreshTokens).set({ revokedAt: new Date() }).where(eq(schema.refreshTokens.userId, user.id));
    });
    return { ok: true, note: "All other sessions have been signed out" };
  });
};
