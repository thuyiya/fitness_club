import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { badRequest, notFound } from "../errors.js";
import { notify } from "../lib/notify.js";

/** Every admin mutation writes an audit row; who changed a role matters later. */
async function audit(actorId: string, action: string, entityType: string, entityId: string, metadata?: unknown) {
  await db.insert(schema.auditLogs).values({
    actorId, action, entityType, entityId,
    metadata: (metadata ?? null) as never,
  });
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  const adminOnly = app.requireRole("admin");

  /** Platform overview. One round trip for the whole dashboard. */
  app.get("/admin/overview", { preHandler: adminOnly }, async () => {
    const [counts] = await db
      .select({
        gyms: sql<number>`(SELECT count(*)::int FROM gyms)`,
        coaches: sql<number>`(SELECT count(*)::int FROM users WHERE role = 'coach')`,
        members: sql<number>`(SELECT count(*)::int FROM users WHERE role = 'member')`,
        activeSubs: sql<number>`(SELECT count(*)::int FROM subscriptions WHERE status IN ('active','trialing'))`,
        mrrCents: sql<number>`(
          SELECT coalesce(sum(CASE WHEN sp.interval = 'year' THEN sp.price_cents / 12 ELSE sp.price_cents END), 0)::bigint
          FROM subscriptions s JOIN subscription_plans sp ON sp.id = s.plan_id
          WHERE s.status IN ('active','trialing')
        )`,
        pendingRequests: sql<number>`(SELECT count(*)::int FROM join_requests WHERE status = 'pending')`,
        logsToday: sql<number>`(SELECT count(*)::int FROM meal_logs WHERE date = current_date)`,
      })
      .from(sql`(SELECT 1) AS t`);

    const [catalog] = await db
      .select({
        foods: sql<number>`(SELECT count(*)::int FROM foods)`,
        meals: sql<number>`(SELECT count(*)::int FROM meals)`,
        exercises: sql<number>`(SELECT count(*)::int FROM exercises)`,
        activities: sql<number>`(SELECT count(*)::int FROM activities)`,
        embedded: sql<number>`(
          SELECT (SELECT count(*) FROM foods WHERE embedding IS NOT NULL)
               + (SELECT count(*) FROM meals WHERE embedding IS NOT NULL)
               + (SELECT count(*) FROM exercises WHERE embedding IS NOT NULL)
        )::int`,
        vectorReady: sql<boolean>`EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')`,
      })
      .from(sql`(SELECT 1) AS t`);

    return {
      platform: { ...counts, mrr: Number(counts!.mrrCents) / 100 },
      catalog,
    };
  });

  app.get("/admin/users", { preHandler: adminOnly }, async (req) => {
    const q = z
      .object({
        q: z.string().trim().optional(),
        role: z.enum(["admin", "coach", "member"]).optional(),
        limit: z.coerce.number().min(1).max(200).default(50),
        offset: z.coerce.number().min(0).default(0),
      })
      .parse(req.query);

    const where = [];
    if (q.q) where.push(or(ilike(schema.users.name, `%${q.q}%`), ilike(schema.users.email, `%${q.q}%`))!);
    if (q.role) where.push(eq(schema.users.role, q.role));

    const rows = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        status: schema.users.status,
        lastSeenAt: schema.users.lastSeenAt,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(schema.users.createdAt))
      .limit(q.limit)
      .offset(q.offset);
    return { items: rows };
  });

  /** Role promotion. Deliberately admin-only and audited --- see auth/register. */
  app.post("/admin/users/:id/role", { preHandler: adminOnly }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { role } = z.object({ role: z.enum(["admin", "coach", "member"]) }).parse(req.body);

    if (id === req.user!.id) throw badRequest("You cannot change your own role", "self_demotion");

    const [user] = await db.update(schema.users).set({ role, updatedAt: new Date() }).where(eq(schema.users.id, id)).returning();
    if (!user) throw notFound("User");
    await audit(req.user!.id, "role_changed", "user", id, { role });
    return { user: { id: user.id, name: user.name, role: user.role } };
  });

  app.post("/admin/users/:id/status", { preHandler: adminOnly }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { status } = z.object({ status: z.enum(["pending", "active", "suspended"]) }).parse(req.body);
    if (id === req.user!.id) throw badRequest("You cannot suspend yourself", "self_suspension");

    const user = await db.transaction(async (tx) => {
      const [u] = await tx.update(schema.users).set({ status, updatedAt: new Date() }).where(eq(schema.users.id, id)).returning();
      // Suspension must end live sessions, or the access token keeps working
      // for up to 15 minutes and the refresh keeps renewing it.
      if (status === "suspended" && u) {
        await tx.update(schema.refreshTokens).set({ revokedAt: new Date() }).where(eq(schema.refreshTokens.userId, id));
      }
      return u;
    });
    if (!user) throw notFound("User");
    await audit(req.user!.id, "status_changed", "user", id, { status });
    return { user: { id: user.id, status: user.status } };
  });

  /**
   * Every gym, searchable and filterable by status.
   *
   * The counts are split by role: an admin reviewing a gym cares how many
   * COACHES work there separately from how many members train there, and a
   * single "member count" hides which of the two a new gym actually has.
   */
  app.get("/admin/gyms", { preHandler: adminOnly }, async (req) => {
    const q = z
      .object({
        q: z.string().trim().optional(),
        status: z.enum(["pending", "active", "rejected", "archived"]).optional(),
        limit: z.coerce.number().min(1).max(200).default(100),
      })
      .parse(req.query);

    const where = [];
    if (q.q) where.push(or(ilike(schema.gyms.name, `%${q.q}%`), ilike(schema.gyms.city, `%${q.q}%`))!);
    if (q.status) where.push(eq(schema.gyms.status, q.status));

    const rows = await db
      .select({
        id: schema.gyms.id,
        name: schema.gyms.name,
        city: schema.gyms.city,
        country: schema.gyms.country,
        address: schema.gyms.address,
        phone: schema.gyms.phone,
        website: schema.gyms.website,
        latitude: schema.gyms.latitude,
        longitude: schema.gyms.longitude,
        status: schema.gyms.status,
        capacity: schema.gyms.capacity,
        createdAt: schema.gyms.createdAt,
        owner: { id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role },
        // Literal table qualification --- an interpolated drizzle column inside
        // a raw sql`` renders unqualified and silently counts the wrong table.
        coachCount: sql<number>`(
          SELECT count(*)::int FROM gym_members gm JOIN users u ON u.id = gm.user_id
          WHERE gm.gym_id = gyms.id AND gm.status = 'active' AND u.role = 'coach'
        )`,
        memberCount: sql<number>`(
          SELECT count(*)::int FROM gym_members gm JOIN users u ON u.id = gm.user_id
          WHERE gm.gym_id = gyms.id AND gm.status = 'active' AND u.role = 'member'
        )`,
        pendingRequests: sql<number>`(SELECT count(*)::int FROM join_requests jr WHERE jr.gym_id = gyms.id AND jr.status = 'pending')`,
        openReports: sql<number>`(SELECT count(*)::int FROM gym_reports gr WHERE gr.gym_id = gyms.id AND gr.status IN ('open','reviewing'))`,
      })
      .from(schema.gyms)
      .innerJoin(schema.users, eq(schema.users.id, schema.gyms.ownerCoachId))
      .where(where.length ? and(...where) : undefined)
      // Pending first: approvals are the reason an admin opens this screen.
      .orderBy(sql`CASE WHEN ${schema.gyms.status} = 'pending' THEN 0 ELSE 1 END`, desc(schema.gyms.createdAt))
      .limit(q.limit);

    const [totals] = await db
      .select({
        all: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) FILTER (WHERE status = 'pending')::int`,
        active: sql<number>`count(*) FILTER (WHERE status = 'active')::int`,
      })
      .from(schema.gyms);

    return { items: rows, totals };
  });

  /** Everything about one gym, for the approval decision. */
  app.get("/admin/gyms/:id", { preHandler: adminOnly }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

    const [gym] = await db
      .select({
        gym: schema.gyms,
        owner: {
          id: schema.users.id, name: schema.users.name, email: schema.users.email,
          phone: schema.users.phone, status: schema.users.status, createdAt: schema.users.createdAt,
          lastSeenAt: schema.users.lastSeenAt,
        },
      })
      .from(schema.gyms)
      .innerJoin(schema.users, eq(schema.users.id, schema.gyms.ownerCoachId))
      .where(eq(schema.gyms.id, id));
    if (!gym) throw notFound("Gym");

    const [staff, members, requests, reports] = await Promise.all([
      db
        .select({
          id: schema.users.id, name: schema.users.name, email: schema.users.email,
          role: schema.users.role, joinedAt: schema.gymMembers.joinedAt, status: schema.gymMembers.status,
        })
        .from(schema.gymMembers)
        .innerJoin(schema.users, eq(schema.users.id, schema.gymMembers.userId))
        .where(and(eq(schema.gymMembers.gymId, id), inArray(schema.users.role, ["coach", "admin"])))
        .orderBy(schema.users.name),
      db
        .select({
          id: schema.users.id, name: schema.users.name, email: schema.users.email,
          joinedAt: schema.gymMembers.joinedAt, status: schema.gymMembers.status,
        })
        .from(schema.gymMembers)
        .innerJoin(schema.users, eq(schema.users.id, schema.gymMembers.userId))
        .where(and(eq(schema.gymMembers.gymId, id), eq(schema.users.role, "member")))
        .orderBy(desc(schema.gymMembers.joinedAt))
        .limit(50),
      db
        .select({ id: schema.joinRequests.id, status: schema.joinRequests.status, createdAt: schema.joinRequests.createdAt })
        .from(schema.joinRequests)
        .where(and(eq(schema.joinRequests.gymId, id), eq(schema.joinRequests.status, "pending"))),
      db
        .select({
          id: schema.gymReports.id, reason: schema.gymReports.reason, detail: schema.gymReports.detail,
          status: schema.gymReports.status, createdAt: schema.gymReports.createdAt,
          resolutionNote: schema.gymReports.resolutionNote,
          reporter: { id: schema.users.id, name: schema.users.name },
        })
        .from(schema.gymReports)
        .leftJoin(schema.users, eq(schema.users.id, schema.gymReports.reporterId))
        .where(eq(schema.gymReports.gymId, id))
        .orderBy(desc(schema.gymReports.createdAt)),
    ]);

    return {
      gym: gym.gym,
      owner: gym.owner,
      instructors: staff,
      members,
      pendingRequests: requests.length,
      reports,
      openReports: reports.filter((r) => r.status === "open" || r.status === "reviewing").length,
    };
  });

  /** Move a complaint along. */
  app.patch("/admin/gym-reports/:id", { preHandler: adminOnly }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
        resolutionNote: z.string().max(500).optional(),
      })
      .parse(req.body);

    const closing = body.status === "resolved" || body.status === "dismissed";
    const [row] = await db
      .update(schema.gymReports)
      .set({
        status: body.status,
        resolutionNote: body.resolutionNote ?? null,
        resolvedBy: closing ? req.user!.id : null,
        resolvedAt: closing ? new Date() : null,
      })
      .where(eq(schema.gymReports.id, id))
      .returning();
    if (!row) throw notFound("Report");
    await audit(req.user!.id, `report_${body.status}`, "gym_report", id, { gymId: row.gymId });
    return { report: row };
  });

  /** Approve or turn down a coach-created gym. */
  app.post("/admin/gyms/:id/decide", { preHandler: adminOnly }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { decision, reason } = z
      .object({ decision: z.enum(["active", "rejected", "archived"]), reason: z.string().max(300).optional() })
      .parse(req.body);

    const gym = await db.query.gyms.findFirst({ where: eq(schema.gyms.id, id) });
    if (!gym) throw notFound("Gym");

    const [updated] = await db
      .update(schema.gyms)
      .set({ status: decision, updatedAt: new Date() })
      .where(eq(schema.gyms.id, id))
      .returning();

    await audit(req.user!.id, "gym_" + decision, "gym", id, { name: gym.name, reason });
    await notify(
      gym.ownerCoachId,
      "system",
      decision === "active" ? "Gym approved" : decision === "rejected" ? "Gym not approved" : "Gym archived",
      decision === "active" ? `${gym.name} is now live` : reason ?? `${gym.name} was ${decision}`,
      { gymId: id },
    );
    return { gym: updated };
  });

  app.get("/admin/audit", { preHandler: adminOnly }, async (req) => {
    const { limit } = z.object({ limit: z.coerce.number().min(1).max(200).default(50) }).parse(req.query);
    const rows = await db
      .select({
        id: schema.auditLogs.id,
        action: schema.auditLogs.action,
        entityType: schema.auditLogs.entityType,
        entityId: schema.auditLogs.entityId,
        metadata: schema.auditLogs.metadata,
        createdAt: schema.auditLogs.createdAt,
        actor: { id: schema.users.id, name: schema.users.name, email: schema.users.email },
      })
      .from(schema.auditLogs)
      .innerJoin(schema.users, eq(schema.users.id, schema.auditLogs.actorId))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit);
    return { items: rows };
  });

  // --- subscription plans ---------------------------------------------------

  app.get("/subscription-plans", { preHandler: app.requireAuth }, async (req) => {
    const { audience } = z.object({ audience: z.enum(["coach", "member"]).optional() }).parse(req.query);
    const where = [eq(schema.subscriptionPlans.active, true)];
    if (audience) where.push(eq(schema.subscriptionPlans.audience, audience));
    const rows = await db.select().from(schema.subscriptionPlans).where(and(...where));
    // Money crosses the wire as integer cents and a display value computed once.
    return { items: rows.map((p) => ({ ...p, price: p.priceCents / 100 })) };
  });

  app.post("/admin/subscription-plans", { preHandler: adminOnly }, async (req, reply) => {
    const body = z
      .object({
        audience: z.enum(["coach", "member"]),
        name: z.string().min(1).max(120),
        priceCents: z.coerce.number().int().min(0),
        currency: z.string().length(3).default("GBP"),
        interval: z.enum(["month", "year"]),
        appleProductId: z.string().optional(),
        googleProductId: z.string().optional(),
        features: z.array(z.string()).default([]),
      })
      .parse(req.body);
    const [plan] = await db.insert(schema.subscriptionPlans).values(body as never).returning();
    await audit(req.user!.id, "plan_created", "subscription_plan", plan!.id, { name: body.name });
    reply.code(201);
    return { plan };
  });
};
