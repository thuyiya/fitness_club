import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { badRequest, notFound } from "../errors.js";

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

  app.get("/admin/gyms", { preHandler: adminOnly }, async () => {
    const rows = await db
      .select({
        id: schema.gyms.id,
        name: schema.gyms.name,
        city: schema.gyms.city,
        status: schema.gyms.status,
        createdAt: schema.gyms.createdAt,
        owner: { id: schema.users.id, name: schema.users.name, email: schema.users.email },
        memberCount: sql<number>`(SELECT count(*)::int FROM gym_members gm WHERE gm.gym_id = ${schema.gyms.id} AND gm.status = 'active')`,
      })
      .from(schema.gyms)
      .innerJoin(schema.users, eq(schema.users.id, schema.gyms.ownerCoachId))
      .orderBy(desc(schema.gyms.createdAt));
    return { items: rows };
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
