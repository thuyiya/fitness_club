import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { badRequest, conflict, notFound } from "../errors.js";
import { assertOwnsGym, coachRoster } from "../lib/access.js";
import { notify } from "../lib/notify.js";
import { resolveLocation } from "../lib/geo.js";

const gymBody = z.object({
  name: z.string().min(1).max(160),
  address: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  // Accepts a bare domain; the client should not have to know we want a scheme.
  website: z.string().max(300).optional().transform((v) =>
    v && v.trim() ? (/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`) : undefined),
  mapsUrl: z.string().max(600).optional(),
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
        ownerCoachId: schema.gyms.ownerCoachId,
        address: schema.gyms.address,
        phone: schema.gyms.phone,
        website: schema.gyms.website,
        mapsUrl: schema.gyms.mapsUrl,
        latitude: schema.gyms.latitude,
        longitude: schema.gyms.longitude,
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
      .where(
        req.user!.role === "admin"
          ? undefined
          // A coach may own a gym or simply work at one, so both count as "mine".
          : or(
              eq(schema.gyms.ownerCoachId, req.user!.id),
              sql`EXISTS (SELECT 1 FROM gym_members gm WHERE gm.gym_id = gyms.id AND gm.user_id = ${req.user!.id} AND gm.status = 'active')`,
            ),
      )
      .orderBy(schema.gyms.name);
    return {
      items: rows.map((g) => ({ ...g, isOwner: g.ownerCoachId === req.user!.id })),
    };
  });

  /**
   * Gyms a coach could ask to join: live ones they are not already part of.
   * Admins pre-create gyms for chains, so a new coach usually joins rather
   * than creating, and offering creation first leads to duplicates.
   */
  app.get("/gyms/browse", { preHandler: coachOnly }, async (req) => {
    const { q } = z.object({ q: z.string().trim().optional() }).parse(req.query);
    const where = [
      eq(schema.gyms.status, "active"),
      sql`${schema.gyms.ownerCoachId} <> ${req.user!.id}`,
      sql`NOT EXISTS (SELECT 1 FROM gym_members gm WHERE gm.gym_id = gyms.id AND gm.user_id = ${req.user!.id})`,
    ];
    if (q) where.push(ilike(schema.gyms.name, `%${q}%`));

    const rows = await db
      .select({
        id: schema.gyms.id, name: schema.gyms.name, city: schema.gyms.city,
        country: schema.gyms.country, coverImageUrl: schema.gyms.coverImageUrl,
        memberCount: sql<number>`(SELECT count(*)::int FROM gym_members gm WHERE gm.gym_id = gyms.id AND gm.status = 'active')`,
        pending: sql<boolean>`EXISTS (SELECT 1 FROM join_requests jr WHERE jr.gym_id = gyms.id AND jr.member_id = ${req.user!.id} AND jr.status = 'pending')`,
      })
      .from(schema.gyms)
      .where(and(...where))
      .orderBy(schema.gyms.name)
      .limit(50);
    return { items: rows };
  });

  app.post("/gyms", { preHandler: coachOnly }, async (req, reply) => {
    const body = gymBody.parse(req.body);

    // A coach-created gym is not live until an admin approves it; an admin
    // creating one has already made that decision.
    const status = req.user!.role === "admin" ? "active" : "pending";

    // Resolve a pin before writing, so the gym is never saved without the
    // coordinates its preview needs. A failure here is not fatal --- the gym
    // still saves, just without a map.
    const coords = await resolveLocation(body);

    const [gym] = await db
      .insert(schema.gyms)
      .values({
        ...body,
        ownerCoachId: req.user!.id,
        status,
        latitude: coords ? String(coords.latitude) : null,
        longitude: coords ? String(coords.longitude) : null,
      })
      .returning();

    // The owner is a member of their own gym from the start, so the roster and
    // "my gyms" queries do not need to special-case ownership.
    await db.insert(schema.gymMembers).values({ gymId: gym!.id, userId: req.user!.id, status: "active" }).onConflictDoNothing();

    if (status === "pending") {
      const admins = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.role, "admin"));
      await Promise.all(
        admins.map((a) => notify(a.id, "join_request", "Gym awaiting approval", `${body.name} was created and needs review`, { gymId: gym!.id })),
      );
    }

    reply.code(201);
    return { gym, needsApproval: status === "pending", located: coords?.source ?? null, precision: coords?.precision ?? null };
  });


  /** One gym with everything the detail view shows. */
  app.get("/gyms/:id", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const gym = await db.query.gyms.findFirst({ where: eq(schema.gyms.id, id) });
    if (!gym) throw notFound("Gym");
    const [counts] = await db
      .select({
        members: sql<number>`(SELECT count(*)::int FROM gym_members gm WHERE gm.gym_id = gyms.id AND gm.status = 'active')`,
        pending: sql<number>`(SELECT count(*)::int FROM join_requests jr WHERE jr.gym_id = gyms.id AND jr.status = 'pending')`,
      })
      .from(schema.gyms)
      .where(eq(schema.gyms.id, id));
    return { gym, ...counts, isOwner: gym.ownerCoachId === req.user!.id };
  });

  app.patch("/gyms/:id", { preHandler: coachOnly }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await assertOwnsGym(req.user!, id);
    const body = gymBody.partial().parse(req.body);

    // Only re-resolve when something that determines the pin actually moved;
    // Nominatim is rate-limited and a name change must not cost a lookup.
    const existing = await db.query.gyms.findFirst({ where: eq(schema.gyms.id, id) });
    const moved = body.mapsUrl !== undefined || body.address !== undefined || body.city !== undefined;
    const coords = moved
      ? await resolveLocation({
          mapsUrl: body.mapsUrl ?? existing?.mapsUrl,
          address: body.address ?? existing?.address,
          city: body.city ?? existing?.city,
          country: body.country ?? existing?.country,
        })
      : null;

    const [gym] = await db
      .update(schema.gyms)
      .set({
        ...body,
        ...(coords ? { latitude: String(coords.latitude), longitude: String(coords.longitude) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.gyms.id, id))
      .returning();
    return { gym, located: coords?.source ?? null };
  });

  /**
   * Preview a pasted link before saving, so a coach sees the pin land on the
   * right building rather than discovering it was wrong after creating the gym.
   */
  app.post("/gyms/resolve-location", { preHandler: coachOnly }, async (req) => {
    const body = z
      .object({
        mapsUrl: z.string().max(600).optional(),
        address: z.string().max(300).optional(),
        city: z.string().max(120).optional(),
        country: z.string().max(120).optional(),
      })
      .parse(req.body);
    const coords = await resolveLocation(body);
    return { coords, resolved: !!coords };
  });

  /** A member asks to join. One pending request per gym is enforced by a partial unique index. */
  app.post("/gyms/:gymId/join-requests", { preHandler: auth }, async (req, reply) => {
    const { gymId } = z.object({ gymId: z.string().uuid() }).parse(req.params);
    const { message, coachId } = z
      .object({ message: z.string().max(500).optional(), coachId: z.string().uuid().optional() })
      .parse(req.body ?? {});

    const gym = await db.query.gyms.findFirst({ where: eq(schema.gyms.id, gymId) });
    if (!gym) throw notFound("Gym");

    const already = await db.query.gymMembers.findFirst({
      where: and(eq(schema.gymMembers.gymId, gymId), eq(schema.gymMembers.userId, req.user!.id)),
    });
    if (already) throw conflict("You are already a member of this gym");

    try {
      // A named coach must actually work at this gym, or approval would link
      // the member to someone unconnected to the place they asked to join.
      if (coachId) {
        const [works] = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(
            and(
              eq(schema.users.id, coachId),
              eq(schema.users.role, "coach"),
              sql`(
                ${gymId}::uuid IN (SELECT g.id FROM gyms g WHERE g.owner_coach_id = users.id)
                OR EXISTS (SELECT 1 FROM gym_members gm WHERE gm.gym_id = ${gymId} AND gm.user_id = users.id AND gm.status = 'active')
              )`,
            ),
          );
        if (!works) throw badRequest("That coach does not work at this gym", "coach_not_at_gym");
      }

      const [row] = await db
        .insert(schema.joinRequests)
        .values({ gymId, memberId: req.user!.id, message: message ?? null, requestedCoachId: coachId ?? null })
        .returning();

      // Tell the people who can act on it: the gym owner, and the named coach.
      const recipients = new Set<string>([gym.ownerCoachId]);
      if (coachId) recipients.add(coachId);
      const who = await db.query.users.findFirst({ where: eq(schema.users.id, req.user!.id) });
      await Promise.all(
        [...recipients].map((id) =>
          notify(id, "join_request", "New join request", `${who?.name ?? "Someone"} asked to join ${gym.name}`, { gymId, requestId: row!.id }),
        ),
      );

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
        requestedCoachId: schema.joinRequests.requestedCoachId,
        requestedCoachName: sql<string | null>`(SELECT u2.name FROM users u2 WHERE u2.id = join_requests.requested_coach_id)`,
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
        // Link the member to the coach they ASKED for, falling back to whoever
        // approved. Approving on someone's behalf is normal --- a gym owner
        // clearing the queue should not steal the client.
        await tx
          .insert(schema.coachMembers)
          .values({ coachId: request.requestedCoachId ?? req.user!.id, memberId: request.memberId, status: "active" })
          .onConflictDoNothing();
      }
    });

    // The member is waiting on this; tell them either way.
    const gymRow = await db.query.gyms.findFirst({ where: eq(schema.gyms.id, request.gymId) });
    await notify(
      request.memberId,
      "join_request",
      decision === "approved" ? "You're in" : "Request declined",
      decision === "approved"
        ? `Your request to join ${gymRow?.name} was approved`
        : `Your request to join ${gymRow?.name} was declined`,
      { gymId: request.gymId },
    );

    return { ok: true, decision, linkedCoachId: request.requestedCoachId ?? req.user!.id };
  });


  /** The member's own requests, so a pending one is visible rather than a guess. */
  app.get("/me/join-requests", { preHandler: auth }, async (req) => {
    const rows = await db
      .select({
        id: schema.joinRequests.id,
        status: schema.joinRequests.status,
        message: schema.joinRequests.message,
        createdAt: schema.joinRequests.createdAt,
        decidedAt: schema.joinRequests.decidedAt,
        gym: { id: schema.gyms.id, name: schema.gyms.name, city: schema.gyms.city },
        requestedCoachName: sql<string | null>`(SELECT u2.name FROM users u2 WHERE u2.id = join_requests.requested_coach_id)`,
      })
      .from(schema.joinRequests)
      .innerJoin(schema.gyms, eq(schema.gyms.id, schema.joinRequests.gymId))
      .where(eq(schema.joinRequests.memberId, req.user!.id))
      .orderBy(desc(schema.joinRequests.createdAt));
    return { items: rows };
  });

  /** The coach's roster --- the list every other coach screen is built on. */
  app.get("/members", { preHandler: coachOnly }, async (req) => {
    return { items: await coachRoster(req.user!.id) };
  });
};
