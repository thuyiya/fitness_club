import { and, asc, desc, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { badRequest, forbidden, notFound } from "../errors.js";
import { assertCanReadMember, assertOwnsGym } from "../lib/access.js";
import { notify } from "../lib/notify.js";

/** Membership of a thread is the authorization check for every message route. */
async function assertInThread(userId: string, threadId: string) {
  const seat = await db.query.threadParticipants.findFirst({
    where: and(eq(schema.threadParticipants.threadId, threadId), eq(schema.threadParticipants.userId, userId)),
  });
  if (!seat) throw notFound("Thread");
  return seat;
}

export const chatRoutes: FastifyPluginAsync = async (app) => {
  const auth = (req: Parameters<typeof app.requireAuth>[0]) => app.requireAuth(req);

  /**
   * The inbox. Unread counts are computed from each participant's
   * `lastReadAt` rather than a per-message read table --- one timestamp per
   * seat instead of a row per message per reader.
   */
  app.get("/threads", { preHandler: auth }, async (req) => {
    const me = req.user!.id;

    const seats = await db
      .select({ threadId: schema.threadParticipants.threadId, lastReadAt: schema.threadParticipants.lastReadAt })
      .from(schema.threadParticipants)
      .where(eq(schema.threadParticipants.userId, me));
    if (seats.length === 0) return { items: [] };

    const ids = seats.map((s) => s.threadId);
    const readBy = new Map(seats.map((s) => [s.threadId, s.lastReadAt]));

    const [threads, others, lastMessages, unread] = await Promise.all([
      db.select().from(schema.threads).where(inArray(schema.threads.id, ids)).orderBy(desc(schema.threads.lastMessageAt)),
      db
        .select({
          threadId: schema.threadParticipants.threadId,
          id: schema.users.id,
          name: schema.users.name,
          role: schema.users.role,
          avatarUrl: schema.users.avatarUrl,
        })
        .from(schema.threadParticipants)
        .innerJoin(schema.users, eq(schema.users.id, schema.threadParticipants.userId))
        .where(and(inArray(schema.threadParticipants.threadId, ids), ne(schema.threadParticipants.userId, me))),
      db
        .select({
          threadId: schema.messages.threadId,
          body: sql<string>`(array_agg(${schema.messages.body} ORDER BY ${schema.messages.createdAt} DESC))[1]`,
          createdAt: sql<string>`max(${schema.messages.createdAt})`,
        })
        .from(schema.messages)
        .where(and(inArray(schema.messages.threadId, ids), isNull(schema.messages.deletedAt)))
        .groupBy(schema.messages.threadId),
      db
        .select({ threadId: schema.messages.threadId, senderId: schema.messages.senderId, createdAt: schema.messages.createdAt })
        .from(schema.messages)
        .where(and(inArray(schema.messages.threadId, ids), isNull(schema.messages.deletedAt), ne(schema.messages.senderId, me))),
    ]);

    return {
      items: threads.map((t) => {
        const seen = readBy.get(t.id);
        return {
          ...t,
          participants: others.filter((o) => o.threadId === t.id),
          lastMessage: lastMessages.find((l) => l.threadId === t.id) ?? null,
          unreadCount: unread.filter((m) => m.threadId === t.id && (!seen || m.createdAt > seen)).length,
        };
      }),
    };
  });

  /**
   * Open (or reuse) a direct thread. Reuse matters: without it every "message
   * my coach" tap creates a new thread and the history fragments.
   */
  app.post("/threads/direct", { preHandler: auth }, async (req, reply) => {
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
    if (userId === req.user!.id) throw badRequest("You cannot open a thread with yourself");

    /**
     * Who may open a thread:
     *   - a coach with one of their own members (assertCanReadMember)
     *   - a member with their coach (the inverse link)
     *   - a member ENQUIRING with a discoverable coach they have not joined
     *
     * The third case is what makes the coach directory useful: nobody commits
     * to a coach before speaking to them. It is bounded by discoverability ---
     * the coach must own or work at an approved gym --- so this is not an open
     * channel to every account on the platform.
     */
    await assertCanReadMember(req.user!, userId).catch(async () => {
      const inverse = await db.query.coachMembers.findFirst({
        where: and(
          eq(schema.coachMembers.coachId, userId),
          eq(schema.coachMembers.memberId, req.user!.id),
          eq(schema.coachMembers.status, "active"),
        ),
      });
      if (inverse) return;

      const [enquirable] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(
          and(
            eq(schema.users.id, userId),
            eq(schema.users.role, "coach"),
            eq(schema.users.status, "active"),
            sql`(
              EXISTS (SELECT 1 FROM gyms g WHERE g.owner_coach_id = users.id AND g.status = 'active')
              OR EXISTS (
                SELECT 1 FROM gym_members gm JOIN gyms g ON g.id = gm.gym_id
                WHERE gm.user_id = users.id AND gm.status = 'active' AND g.status = 'active'
              )
            )`,
          ),
        );
      if (!enquirable) throw forbidden("You are not connected to this person");
    });

    const existing = await db
      .select({ id: schema.threads.id })
      .from(schema.threads)
      .innerJoin(schema.threadParticipants, eq(schema.threadParticipants.threadId, schema.threads.id))
      .where(and(eq(schema.threads.kind, "direct"), inArray(schema.threadParticipants.userId, [req.user!.id, userId])))
      .groupBy(schema.threads.id)
      .having(sql`count(distinct ${schema.threadParticipants.userId}) = 2`);

    if (existing[0]) return { thread: existing[0], created: false };

    const thread = await db.transaction(async (tx) => {
      const [t] = await tx.insert(schema.threads).values({ kind: "direct" }).returning();
      await tx.insert(schema.threadParticipants).values([
        { threadId: t!.id, userId: req.user!.id },
        { threadId: t!.id, userId },
      ]);
      return t!;
    });
    reply.code(201);
    return { thread, created: true };
  });

  /** Messages, newest-first with a cursor so long histories page cleanly. */
  app.get("/threads/:id/messages", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { limit, before } = z
      .object({ limit: z.coerce.number().min(1).max(100).default(50), before: z.string().datetime().optional() })
      .parse(req.query);
    await assertInThread(req.user!.id, id);

    const where = [eq(schema.messages.threadId, id), isNull(schema.messages.deletedAt)];
    if (before) where.push(lt(schema.messages.createdAt, new Date(before)));

    const rows = await db
      .select({
        id: schema.messages.id,
        kind: schema.messages.kind,
        body: schema.messages.body,
        attachmentUrl: schema.messages.attachmentUrl,
        createdAt: schema.messages.createdAt,
        editedAt: schema.messages.editedAt,
        sender: { id: schema.users.id, name: schema.users.name, avatarUrl: schema.users.avatarUrl, role: schema.users.role },
      })
      .from(schema.messages)
      .innerJoin(schema.users, eq(schema.users.id, schema.messages.senderId))
      .where(and(...where))
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit);

    return { items: rows.reverse(), nextCursor: rows.length === limit ? rows[0]?.createdAt : null };
  });

  app.post("/threads/:id/messages", { preHandler: auth }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        body: z.string().min(1).max(4000),
        kind: z.enum(["text", "image"]).default("text"),
        attachmentUrl: z.string().url().optional(),
      })
      .parse(req.body);
    await assertInThread(req.user!.id, id);

    const message = await db.transaction(async (tx) => {
      const [m] = await tx
        .insert(schema.messages)
        .values({ threadId: id, senderId: req.user!.id, ...body })
        .returning();
      // Denormalised so the inbox can order by recency without touching messages.
      await tx.update(schema.threads).set({ lastMessageAt: new Date() }).where(eq(schema.threads.id, id));
      return m!;
    });

    // Notify everyone else in the thread. A message the member never sees is
    // the single most common way coaching apps lose people.
    const others = await db
      .select({ userId: schema.threadParticipants.userId })
      .from(schema.threadParticipants)
      .where(and(eq(schema.threadParticipants.threadId, id), ne(schema.threadParticipants.userId, req.user!.id)));
    const sender = await db.query.users.findFirst({ where: eq(schema.users.id, req.user!.id) });
    await Promise.all(
      others.map((o) =>
        notify(o.userId, "message", sender?.name ?? "New message", body.body.slice(0, 140), { threadId: id }),
      ),
    );

    reply.code(201);
    return { message };
  });

  /** Mark read up to now. Idempotent; moving the timestamp is the whole action. */
  app.post("/threads/:id/read", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await assertInThread(req.user!.id, id);
    await db
      .update(schema.threadParticipants)
      .set({ lastReadAt: new Date() })
      .where(and(eq(schema.threadParticipants.threadId, id), eq(schema.threadParticipants.userId, req.user!.id)));
    return { ok: true };
  });

  // --- announcements --------------------------------------------------------

  app.post("/announcements", { preHandler: app.requireRole("coach", "admin") }, async (req, reply) => {
    const body = z
      .object({
        gymId: z.string().uuid(),
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(4000),
        imageUrl: z.string().url().optional(),
      })
      .parse(req.body);
    await assertOwnsGym(req.user!, body.gymId);

    const [row] = await db
      .insert(schema.announcements)
      .values({ ...body, authorId: req.user!.id, publishedAt: new Date() })
      .returning();

    const members = await db
      .select({ userId: schema.gymMembers.userId })
      .from(schema.gymMembers)
      .where(and(eq(schema.gymMembers.gymId, body.gymId), eq(schema.gymMembers.status, "active")));
    await Promise.all(
      members.map((m) => notify(m.userId, "announcement", body.title, body.body.slice(0, 140), { announcementId: row!.id })),
    );

    reply.code(201);
    return { announcement: row };
  });

  /** Announcements for every gym the caller belongs to, with read state. */
  app.get("/announcements", { preHandler: auth }, async (req) => {
    const gyms = await db
      .select({ gymId: schema.gymMembers.gymId })
      .from(schema.gymMembers)
      .where(and(eq(schema.gymMembers.userId, req.user!.id), eq(schema.gymMembers.status, "active")));

    const owned = await db
      .select({ gymId: schema.gyms.id })
      .from(schema.gyms)
      .where(eq(schema.gyms.ownerCoachId, req.user!.id));

    const ids = [...new Set([...gyms, ...owned].map((g) => g.gymId))];
    if (ids.length === 0) return { items: [] };

    const rows = await db
      .select({
        id: schema.announcements.id,
        title: schema.announcements.title,
        body: schema.announcements.body,
        imageUrl: schema.announcements.imageUrl,
        publishedAt: schema.announcements.publishedAt,
        author: { id: schema.users.id, name: schema.users.name, avatarUrl: schema.users.avatarUrl },
        readAt: schema.announcementReads.readAt,
      })
      .from(schema.announcements)
      .innerJoin(schema.users, eq(schema.users.id, schema.announcements.authorId))
      .leftJoin(
        schema.announcementReads,
        and(
          eq(schema.announcementReads.announcementId, schema.announcements.id),
          eq(schema.announcementReads.userId, req.user!.id),
        ),
      )
      .where(inArray(schema.announcements.gymId, ids))
      .orderBy(desc(schema.announcements.publishedAt));

    return { items: rows, unreadCount: rows.filter((r) => !r.readAt).length };
  });

  app.post("/announcements/:id/read", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await db
      .insert(schema.announcementReads)
      .values({ announcementId: id, userId: req.user!.id })
      .onConflictDoNothing();
    return { ok: true };
  });

  // --- notifications --------------------------------------------------------

  app.get("/notifications", { preHandler: auth }, async (req) => {
    const rows = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, req.user!.id))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(50);
    return { items: rows, unreadCount: rows.filter((r) => !r.readAt).length };
  });

  app.post("/notifications/read", { preHandler: auth }, async (req) => {
    const { ids } = z.object({ ids: z.array(z.string().uuid()).optional() }).parse(req.body ?? {});
    const where = ids?.length
      ? and(eq(schema.notifications.userId, req.user!.id), inArray(schema.notifications.id, ids))
      : and(eq(schema.notifications.userId, req.user!.id), isNull(schema.notifications.readAt));
    await db.update(schema.notifications).set({ readAt: new Date() }).where(where);
    return { ok: true };
  });

  /** Expo push registration. Re-registering the same token flips it back on. */
  app.post("/push-tokens", { preHandler: auth }, async (req) => {
    const body = z
      .object({ expoPushToken: z.string().min(10), platform: z.enum(["ios", "android", "web"]) })
      .parse(req.body);
    const [row] = await db
      .insert(schema.pushTokens)
      .values({ userId: req.user!.id, ...body, enabled: true })
      .onConflictDoUpdate({
        target: schema.pushTokens.expoPushToken,
        set: { userId: req.user!.id, platform: body.platform, enabled: true },
      })
      .returning();
    return { pushToken: row };
  });
};
