import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { forbidden, notFound } from "../errors.js";
import { assertCanReadMember } from "../lib/access.js";
import { notify } from "../lib/notify.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const goalRoutes: FastifyPluginAsync = async (app) => {
  const auth = (req: Parameters<typeof app.requireAuth>[0]) => app.requireAuth(req);

  /**
   * Goals with their per-day entries --- the data behind the dot graph. Entries
   * come back as one row per evaluated day, so the client draws a filled dot
   * for `achieved` and an outline for everything else.
   */
  app.get("/goals", { preHandler: auth }, async (req) => {
    const { memberId, from, to } = z
      .object({ memberId: z.string().uuid().optional(), from: isoDate.optional(), to: isoDate.optional() })
      .parse(req.query);
    const member = memberId ?? req.user!.id;
    await assertCanReadMember(req.user!, member);

    const goals = await db
      .select()
      .from(schema.goals)
      .where(and(eq(schema.goals.memberId, member), eq(schema.goals.status, "active")))
      .orderBy(asc(schema.goals.createdAt));

    if (goals.length === 0) return { items: [] };

    const ids = goals.map((g) => g.id);
    const window = [inArray(schema.goalEntries.goalId, ids)];
    if (from) window.push(gte(schema.goalEntries.date, from));
    if (to) window.push(lte(schema.goalEntries.date, to));

    const entries = await db
      .select()
      .from(schema.goalEntries)
      .where(and(...window))
      .orderBy(asc(schema.goalEntries.date));

    return {
      items: goals.map((g) => {
        const mine = entries.filter((e) => e.goalId === g.id);
        return {
          ...g,
          entries: mine.map((e) => ({ date: e.date, value: e.value, achieved: e.achieved })),
          achievedCount: mine.filter((e) => e.achieved).length,
          evaluatedCount: mine.length,
        };
      }),
    };
  });

  /**
   * Create a goal. A member creates their own; a coach creates one for a
   * member they hold. `source` is derived from who is calling, never trusted
   * from the body --- otherwise a member could forge a coach-assigned goal.
   */
  app.post("/goals", { preHandler: auth }, async (req, reply) => {
    const body = z
      .object({
        memberId: z.string().uuid().optional(),
        title: z.string().min(1).max(160),
        metric: z.string().min(1).max(60),
        targetValue: z.coerce.number().transform(String),
        unit: z.string().max(20).optional(),
        period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
        startDate: isoDate,
        endDate: isoDate.optional(),
      })
      .parse(req.body);

    const member = body.memberId ?? req.user!.id;
    if (member !== req.user!.id) {
      if (req.user!.role === "member") throw forbidden("Members can only set their own goals");
      await assertCanReadMember(req.user!, member);
    }

    const [goal] = await db
      .insert(schema.goals)
      .values({
        memberId: member,
        createdBy: req.user!.id,
        source: member === req.user!.id ? "personal" : "coach",
        title: body.title,
        metric: body.metric,
        targetValue: body.targetValue,
        unit: body.unit ?? null,
        period: body.period,
        startDate: body.startDate,
        endDate: body.endDate ?? null,
      })
      .returning();
    if (goal!.source === "coach") {
      await notify(member, "system", "New goal from your coach", goal!.title, { goalId: goal!.id });
    } else {
      // Tell the coach their member set themselves a goal, so it can be
      // reviewed rather than discovered by accident weeks later.
      const link = await db.query.coachMembers.findFirst({
        where: and(eq(schema.coachMembers.memberId, member), eq(schema.coachMembers.status, "active")),
      });
      if (link) {
        const who = await db.query.users.findFirst({ where: eq(schema.users.id, member) });
        await notify(link.coachId, "system", `${who?.name ?? "A member"} set a goal`, goal!.title, { goalId: goal!.id, memberId: member });
      }
    }

    reply.code(201);
    return { goal };
  });

  /** Record or correct one day's result. Idempotent per goal per date. */
  app.put("/goals/:id/entries", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({ date: isoDate, value: z.coerce.number().transform(String) }).parse(req.body);

    const goal = await db.query.goals.findFirst({ where: eq(schema.goals.id, id) });
    if (!goal) throw notFound("Goal");
    await assertCanReadMember(req.user!, goal.memberId);

    // Achievement is computed here, not supplied, so the dot graph always
    // agrees with the target the goal was created with.
    const achieved = Number(body.value) >= Number(goal.targetValue);

    const [entry] = await db
      .insert(schema.goalEntries)
      .values({ goalId: id, date: body.date, value: body.value, achieved, evaluatedAt: new Date() })
      .onConflictDoUpdate({
        target: [schema.goalEntries.goalId, schema.goalEntries.date],
        set: { value: body.value, achieved, evaluatedAt: new Date() },
      })
      .returning();
    return { entry };
  });
};
