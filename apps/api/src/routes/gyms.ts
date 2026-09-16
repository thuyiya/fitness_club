import { and, eq, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { badRequest, conflict, notFound } from "../errors.js";
import { assertOwnsGym, coachRoster } from "../lib/access.js";

const gymBody = z.object({
  name: z.string().min(1).max(160),
  address: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  capacity: z.coerce.number().int().positive().optional(),
});

export const gymRoutes: FastifyPluginAsync = async (app) => {
  const auth = (req: Parameters<typeof app.requireAuth>[0]) => app.requireAuth(req);
  const coachOnly = app.requireRole("coach", "admin");

  /** Gyms this coach owns, with a live member count. */
  app.get("/gyms", { preHandler: coachOnly }, async (req) => {
    const rows = await db
      .select({
        id: schema.gyms.id,
        name: schema.gyms.name,
        city: schema.gyms.city,
        country: schema.gyms.country,
        capacity: schema.gyms.capacity,
        status: schema.gyms.status,
        coverImageUrl: schema.gyms.coverImageUrl,
        // Table names are written out literally here. Interpolating a drizzle
        // column into a raw sql`` template renders it UNQUALIFIED, so the
        // correlation becomes `WHERE gym_id = id` --- which resolves `id` to
        // the INNER table and silently counts zero instead of erroring.
        memberCount: sql<number>`(
          SELECT count(*)::int FROM gym_members gm
          WHERE gm.gym_id = gyms.id AND gm.status = 'active'
        )`,
        pendingRequests: sql<number>`(
          SELECT count(*)::int FROM join_requests jr
          WHERE jr.gym_id = gyms.id AND jr.status = 'pending'
        )`,
      })
      .from(schema.gyms)
      .where(req.user!.role === "admin" ? undefined : eq(schema.gyms.ownerCoachId, req.user!.id))
      .orderBy(schema.gyms.name);
    return { items: rows };
  });

  app.post("/gyms", { preHandler: coachOnly }, async (req, reply) => {
    const body = gymBody.parse(req.body);
    const [gym] = await db.insert(schema.gyms).values({ ...body, ownerCoachId: req.user!.id }).returning();
    reply.code(201);
    return { gym };
  });

  /** A member asks to join. One pending request per gym is enforced by a partial unique index. */
  app.post("/gyms/:gymId/join-requests", { preHandler: auth }, async (req, reply) => {
    const { gymId } = z.object({ gymId: z.string().uuid() }).parse(req.params);
    const { message } = z.object({ message: z.string().max(500).optional() }).parse(req.body ?? {});

    const gym = await db.query.gyms.findFirst({ where: eq(schema.gyms.id, gymId) });
    if (!gym) throw notFound("Gym");

    const already = await db.query.gymMembers.findFirst({
      where: and(eq(schema.gymMembers.gymId, gymId), eq(schema.gymMembers.userId, req.user!.id)),
    });
    if (already) throw conflict("You are already a member of this gym");

    try {
      const [row] = await db
        .insert(schema.joinRequests)
        .values({ gymId, memberId: req.user!.id, message: message ?? null })
        .returning();
      reply.code(201);
      return { request: row };
    } catch (e) {
      // 23505 = unique_violation. The index is partial (WHERE status='pending'),
      // so this fires only on a second PENDING request --- a rejected one may
      // always be retried. Matched on the SQLSTATE rather than the message,
      // which is not a stable contract.
      const err = e as { code?: string; constraint_name?: string };
      if (err.code === "23505") {
        throw conflict("You already have a request pending for this gym");
      }
      throw e;
    }
  });

  app.get("/gyms/:gymId/join-requests", { preHandler: coachOnly }, async (req) => {
    const { gymId } = z.object({ gymId: z.string().uuid() }).parse(req.params);
    await assertOwnsGym(req.user!, gymId);
    const rows = await db
      .select({
        id: schema.joinRequests.id,
        status: schema.joinRequests.status,
        message: schema.joinRequests.message,
        createdAt: schema.joinRequests.createdAt,
        member: { id: schema.users.id, name: schema.users.name, email: schema.users.email, avatarUrl: schema.users.avatarUrl },
      })
      .from(schema.joinRequests)
      .innerJoin(schema.users, eq(schema.users.id, schema.joinRequests.memberId))
      .where(and(eq(schema.joinRequests.gymId, gymId), eq(schema.joinRequests.status, "pending")))
      .orderBy(schema.joinRequests.createdAt);
    return { items: rows };
  });

  /**
   * Approving a request does three things atomically: decide the request, add
   * the gym membership, and open the coach-member link that every other
   * endpoint's authorization depends on. Splitting these would leave a member
   * visible in a gym that their coach cannot actually read.
   */
  app.post("/join-requests/:id/decide", { preHandler: coachOnly }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { decision } = z.object({ decision: z.enum(["approved", "rejected"]) }).parse(req.body);

    const request = await db.query.joinRequests.findFirst({ where: eq(schema.joinRequests.id, id) });
    if (!request) throw notFound("Request");
    if (request.status !== "pending") throw badRequest("This request has already been decided");
    await assertOwnsGym(req.user!, request.gymId);

    await db.transaction(async (tx) => {
      await tx
        .update(schema.joinRequests)
        .set({ status: decision, decidedBy: req.user!.id, decidedAt: new Date() })
        .where(eq(schema.joinRequests.id, id));

      if (decision === "approved") {
        await tx
          .insert(schema.gymMembers)
          .values({ gymId: request.gymId, userId: request.memberId, status: "active" })
          .onConflictDoNothing();
        await tx
          .insert(schema.coachMembers)
          .values({ coachId: req.user!.id, memberId: request.memberId, status: "active" })
          .onConflictDoNothing();
      }
    });

    return { ok: true, decision };
  });

  /** The coach's roster --- the list every other coach screen is built on. */
  app.get("/members", { preHandler: coachOnly }, async (req) => {
    return { items: await coachRoster(req.user!.id) };
  });
};
