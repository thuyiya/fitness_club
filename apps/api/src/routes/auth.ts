import { and, eq, gt, isNull } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { hashRefreshToken, newRefreshToken, refreshExpiry, signAccessToken } from "../auth/tokens.js";
import { db, schema } from "../db.js";
import { badRequest, conflict, unauthorized } from "../errors.js";

const credentials = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(10, "Password must be at least 10 characters"),
});

const registerBody = credentials.extend({
  name: z.string().min(1).max(120),
  role: z.enum(["coach", "member"]).default("member"),
  timezone: z.string().default("UTC"),
});

/** Issues a fresh pair and persists only the digest of the refresh token. */
async function issueSession(user: { id: string; role: "admin" | "coach" | "member" }, userAgent?: string) {
  const refresh = newRefreshToken();
  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    tokenHash: refresh.hash,
    expiresAt: refreshExpiry(),
    userAgent: userAgent?.slice(0, 200) ?? null,
  });
  return {
    accessToken: await signAccessToken(user.id, user.role),
    refreshToken: refresh.token,
  };
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/register", async (req, reply) => {
    const body = registerBody.parse(req.body);

    // `admin` is deliberately absent from the enum: an admin is promoted by
    // another admin, never self-declared at the public signup endpoint.
    const existing = await db.query.users.findFirst({ where: eq(schema.users.email, body.email) });
    if (existing) throw conflict("An account with that email already exists");

    const [user] = await db
      .insert(schema.users)
      .values({
        email: body.email,
        name: body.name,
        role: body.role,
        timezone: body.timezone,
        passwordHash: await hashPassword(body.password),
      })
      .returning({ id: schema.users.id, role: schema.users.role, email: schema.users.email, name: schema.users.name });

    reply.code(201);
    return { user, ...(await issueSession(user!, req.headers["user-agent"])) };
  });

  app.post("/auth/login", async (req) => {
    const body = credentials.parse(req.body);
    const user = await db.query.users.findFirst({ where: eq(schema.users.email, body.email) });

    // Hash even when the user is missing, so response time does not reveal
    // whether an email is registered.
    const ok = user
      ? await verifyPassword(user.passwordHash, body.password)
      : await verifyPassword("$argon2id$v=19$m=19456,t=2,p=1$aaaaaaaaaaaaaaaa$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", body.password);
    if (!user || !ok) throw unauthorized("Incorrect email or password");
    if (user.status === "suspended") throw unauthorized("This account is suspended");

    await db.update(schema.users).set({ lastSeenAt: new Date() }).where(eq(schema.users.id, user.id));
    return {
      user: { id: user.id, role: user.role, email: user.email, name: user.name },
      ...(await issueSession(user, req.headers["user-agent"])),
    };
  });

  app.post("/auth/refresh", async (req) => {
    const { refreshToken } = z.object({ refreshToken: z.string().min(20) }).parse(req.body);
    const digest = hashRefreshToken(refreshToken);

    const row = await db.query.refreshTokens.findFirst({
      where: and(
        eq(schema.refreshTokens.tokenHash, digest),
        isNull(schema.refreshTokens.revokedAt),
        gt(schema.refreshTokens.expiresAt, new Date()),
      ),
    });
    if (!row) throw unauthorized("Invalid or expired refresh token");

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, row.userId) });
    if (!user || user.status === "suspended") throw unauthorized();

    // Rotation: the presented token dies as the new one is issued, so a stolen
    // token is usable at most once and its reuse is detectable.
    await db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(schema.refreshTokens.id, row.id));

    return issueSession(user, req.headers["user-agent"]);
  });

  app.post("/auth/logout", async (req) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    await db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(schema.refreshTokens.tokenHash, hashRefreshToken(refreshToken)));
    return { ok: true };
  });

  app.get("/auth/me", { preHandler: (req) => app.requireAuth(req) }, async (req) => {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.user!.id),
      columns: { passwordHash: false },
    });
    if (!user) throw badRequest("User no longer exists");
    return { user };
  });
};
