import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { notFound } from "../errors.js";

/**
 * A coach is DISCOVERABLE when they own or work at an active gym.
 *
 * Without that condition the directory would list every account that ever
 * signed up as a coach, including half-finished ones and any created to poke
 * at the API. Tying visibility to an approved gym means an admin has already
 * vouched for the place they work.
 */
const discoverable = sql`(
  EXISTS (SELECT 1 FROM gyms g WHERE g.owner_coach_id = users.id AND g.status = 'active')
  OR EXISTS (
    SELECT 1 FROM gym_members gm JOIN gyms g ON g.id = gm.gym_id
    WHERE gm.user_id = users.id AND gm.status = 'active' AND g.status = 'active'
  )
)`;

export const discoverRoutes: FastifyPluginAsync = async (app) => {
  const auth = (req: Parameters<typeof app.requireAuth>[0]) => app.requireAuth(req);

  /** Gyms a member can browse, to find the coaches who work there. */
  app.get("/discover/gyms", { preHandler: auth }, async (req) => {
    const { q, limit } = z
      .object({ q: z.string().trim().optional(), limit: z.coerce.number().min(1).max(50).default(25) })
      .parse(req.query);

    const where = [eq(schema.gyms.status, "active")];
    if (q) where.push(or(ilike(schema.gyms.name, `%${q}%`), ilike(schema.gyms.city, `%${q}%`))!);

    const rows = await db
      .select({
        id: schema.gyms.id,
        name: schema.gyms.name,
        city: schema.gyms.city,
        country: schema.gyms.country,
        address: schema.gyms.address,
        website: schema.gyms.website,
        latitude: schema.gyms.latitude,
        longitude: schema.gyms.longitude,
        coachCount: sql<number>`(
          SELECT count(*)::int FROM gym_members gm JOIN users u ON u.id = gm.user_id
          WHERE gm.gym_id = gyms.id AND gm.status = 'active' AND u.role = 'coach'
        )`,
        memberCount: sql<number>`(
          SELECT count(*)::int FROM gym_members gm JOIN users u ON u.id = gm.user_id
          WHERE gm.gym_id = gyms.id AND gm.status = 'active' AND u.role = 'member'
        )`,
        alreadyMember: sql<boolean>`EXISTS (
          SELECT 1 FROM gym_members gm WHERE gm.gym_id = gyms.id AND gm.user_id = ${req.user!.id} AND gm.status = 'active'
        )`,
        requested: sql<boolean>`EXISTS (
          SELECT 1 FROM join_requests jr WHERE jr.gym_id = gyms.id AND jr.member_id = ${req.user!.id} AND jr.status = 'pending'
        )`,
      })
      .from(schema.gyms)
      .where(and(...where))
      .orderBy(asc(schema.gyms.name))
      .limit(limit);
    return { items: rows };
  });

  /** Search coaches by name or headline, optionally scoped to one gym. */
  app.get("/discover/coaches", { preHandler: auth }, async (req) => {
    const { q, gymId, limit } = z
      .object({
        q: z.string().trim().optional(),
        gymId: z.string().uuid().optional(),
        limit: z.coerce.number().min(1).max(50).default(25),
      })
      .parse(req.query);

    const where = [eq(schema.users.role, "coach"), eq(schema.users.status, "active"), discoverable];
    if (q) where.push(or(ilike(schema.users.name, `%${q}%`), ilike(schema.coachProfiles.headline, `%${q}%`))!);
    if (gymId) {
      where.push(sql`(
        EXISTS (SELECT 1 FROM gyms g WHERE g.id = ${gymId} AND g.owner_coach_id = users.id)
        OR EXISTS (SELECT 1 FROM gym_members gm WHERE gm.gym_id = ${gymId} AND gm.user_id = users.id AND gm.status = 'active')
      )`);
    }

    const rows = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        avatarUrl: schema.users.avatarUrl,
        bio: schema.users.bio,
        headline: schema.coachProfiles.headline,
        specialties: schema.coachProfiles.specialties,
        yearsExperience: schema.coachProfiles.yearsExperience,
        acceptingClients: schema.coachProfiles.acceptingClients,
        priceFrom: schema.coachProfiles.priceFrom,
        currency: schema.coachProfiles.currency,
        memberCount: sql<number>`(
          SELECT count(*)::int FROM coach_members cm WHERE cm.coach_id = users.id AND cm.status = 'active'
        )`,
        gymNames: sql<string[]>`ARRAY(
          SELECT g.name FROM gyms g
          WHERE g.status = 'active' AND (
            g.owner_coach_id = users.id
            OR EXISTS (SELECT 1 FROM gym_members gm WHERE gm.gym_id = g.id AND gm.user_id = users.id AND gm.status = 'active')
          )
          ORDER BY g.name LIMIT 3
        )`,
        activePromotions: sql<number>`(
          SELECT count(*)::int FROM coach_promotions cp
          WHERE cp.coach_id = users.id AND cp.is_active
            AND (cp.starts_on IS NULL OR cp.starts_on <= current_date)
            AND (cp.ends_on IS NULL OR cp.ends_on >= current_date)
        )`,
      })
      .from(schema.users)
      .leftJoin(schema.coachProfiles, eq(schema.coachProfiles.coachId, schema.users.id))
      .where(and(...where))
      // Coaches taking clients first; a directory that leads with closed books
      // wastes the reader's time.
      .orderBy(desc(sql`coalesce(${schema.coachProfiles.acceptingClients}, true)`), asc(schema.users.name))
      .limit(limit);
    return { items: rows };
  });

  /** A coach's public profile, with whatever they are currently promoting. */
  app.get("/discover/coaches/:id", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

    const [coach] = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        avatarUrl: schema.users.avatarUrl,
        bio: schema.users.bio,
        createdAt: schema.users.createdAt,
        headline: schema.coachProfiles.headline,
        specialties: schema.coachProfiles.specialties,
        certifications: schema.coachProfiles.certifications,
        languages: schema.coachProfiles.languages,
        yearsExperience: schema.coachProfiles.yearsExperience,
        acceptingClients: schema.coachProfiles.acceptingClients,
        priceFrom: schema.coachProfiles.priceFrom,
        currency: schema.coachProfiles.currency,
      })
      .from(schema.users)
      .leftJoin(schema.coachProfiles, eq(schema.coachProfiles.coachId, schema.users.id))
      .where(and(eq(schema.users.id, id), eq(schema.users.role, "coach")));
    if (!coach) throw notFound("Coach");

    const today = new Date().toISOString().slice(0, 10);
    const [gyms, promotions, stats, link] = await Promise.all([
      db
        .select({
          id: schema.gyms.id, name: schema.gyms.name, city: schema.gyms.city,
          address: schema.gyms.address, latitude: schema.gyms.latitude, longitude: schema.gyms.longitude,
          isOwner: sql<boolean>`gyms.owner_coach_id = ${id}`,
        })
        .from(schema.gyms)
        .where(
          and(
            eq(schema.gyms.status, "active"),
            or(
              eq(schema.gyms.ownerCoachId, id),
              sql`EXISTS (SELECT 1 FROM gym_members gm WHERE gm.gym_id = gyms.id AND gm.user_id = ${id} AND gm.status = 'active')`,
            )!,
          ),
        ),
      db
        .select()
        .from(schema.coachPromotions)
        .where(
          and(
            eq(schema.coachPromotions.coachId, id),
            eq(schema.coachPromotions.isActive, true),
            or(isNull(schema.coachPromotions.startsOn), lte(schema.coachPromotions.startsOn, today))!,
            or(isNull(schema.coachPromotions.endsOn), gte(schema.coachPromotions.endsOn, today))!,
          ),
        )
        .orderBy(desc(schema.coachPromotions.createdAt)),
      db
        .select({ members: sql<number>`count(*)::int` })
        .from(schema.coachMembers)
        .where(and(eq(schema.coachMembers.coachId, id), eq(schema.coachMembers.status, "active"))),
      db.query.coachMembers.findFirst({
        where: and(eq(schema.coachMembers.coachId, id), eq(schema.coachMembers.memberId, req.user!.id)),
      }),
    ]);

    return {
      coach,
      gyms,
      promotions,
      memberCount: stats[0]?.members ?? 0,
      // Drives the call to action: enquire, request to join, or already yours.
      relationship: link?.status ?? null,
    };
  });

  // --- the coach's own editing side -----------------------------------------

  app.get("/me/coach-profile", { preHandler: app.requireRole("coach", "admin") }, async (req) => {
    const profile = await db.query.coachProfiles.findFirst({ where: eq(schema.coachProfiles.coachId, req.user!.id) });
    const promotions = await db
      .select()
      .from(schema.coachPromotions)
      .where(eq(schema.coachPromotions.coachId, req.user!.id))
      .orderBy(desc(schema.coachPromotions.createdAt));
    return { profile: profile ?? null, promotions };
  });

  app.put("/me/coach-profile", { preHandler: app.requireRole("coach", "admin") }, async (req) => {
    const body = z
      .object({
        headline: z.string().max(160).optional(),
        specialties: z.array(z.string().max(40)).max(12).optional(),
        certifications: z.array(z.string().max(80)).max(12).optional(),
        languages: z.array(z.string().max(40)).max(8).optional(),
        yearsExperience: z.coerce.number().int().min(0).max(70).optional(),
        priceFrom: z.coerce.number().int().min(0).optional(),
        currency: z.string().length(3).optional(),
        acceptingClients: z.boolean().optional(),
      })
      .parse(req.body);

    const [row] = await db
      .insert(schema.coachProfiles)
      .values({ coachId: req.user!.id, ...body })
      .onConflictDoUpdate({ target: schema.coachProfiles.coachId, set: { ...body, updatedAt: new Date() } })
      .returning();
    return { profile: row };
  });

  app.post("/me/promotions", { preHandler: app.requireRole("coach", "admin") }, async (req, reply) => {
    const body = z
      .object({
        kind: z.enum(["intro_offer", "discount", "free_consultation", "programme_launch", "announcement"]).default("announcement"),
        title: z.string().min(1).max(160),
        body: z.string().max(1000).optional(),
        offerText: z.string().max(120).optional(),
        startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(req.body);

    const [row] = await db
      .insert(schema.coachPromotions)
      .values({ coachId: req.user!.id, ...body })
      .returning();
    reply.code(201);
    return { promotion: row };
  });

  app.patch("/me/promotions/:id", { preHandler: app.requireRole("coach", "admin") }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({ isActive: z.boolean().optional(), title: z.string().min(1).max(160).optional() }).parse(req.body);
    const existing = await db.query.coachPromotions.findFirst({ where: eq(schema.coachPromotions.id, id) });
    if (!existing || existing.coachId !== req.user!.id) throw notFound("Promotion");
    const [row] = await db
      .update(schema.coachPromotions)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.coachPromotions.id, id))
      .returning();
    return { promotion: row };
  });
};
