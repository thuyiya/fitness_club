import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { ZodError } from "zod";
import { env } from "./env.js";
import { ApiError } from "./errors.js";
import { authPlugin } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { calendarRoutes } from "./routes/calendar.js";
import { catalogRoutes } from "./routes/catalog.js";
import { coachRoutes } from "./routes/coach.js";
import { goalRoutes } from "./routes/goals.js";
import { gymRoutes } from "./routes/gyms.js";
import { logRoutes } from "./routes/logs.js";
import { adminRoutes } from "./routes/admin.js";
import { chatRoutes } from "./routes/chat.js";
import { meRoutes } from "./routes/me.js";
import { planRoutes } from "./routes/plans.js";
import { surveyRoutes } from "./routes/surveys.js";

export async function buildServer() {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    // Behind Caddy, so trust the proxy headers for client IPs / rate limiting.
    trustProxy: true,
  });

  // A client that sets content-type: application/json but sends no payload is
  // normal for endpoints whose body is optional; Fastify rejects it by default.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, payload, done) => {
    const raw = (payload as string).trim();
    if (!raw) return done(null, {});
    try {
      done(null, JSON.parse(raw));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(helmet);
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: "1 minute" });
  await app.register(authPlugin);

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "validation_failed",
        issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send({ error: error.code, message: error.message });
    }
    // Fastify's own 4xx (rate limit, malformed body, unknown route) are client
    // errors, not incidents --- logging them at error level buries the 500s
    // that actually need attention.
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    if (status < 500) {
      const message = error instanceof Error ? error.message : "Bad request";
      req.log.info({ status, msg: message }, "client error");
      return reply.code(status).send({ error: status === 429 ? "rate_limited" : "bad_request", message });
    }
    // Anything unrecognised is logged in full and reported as a bare 500 ---
    // never echo an internal message to the client.
    req.log.error({ err: error }, "unhandled error");
    return reply.code(500).send({ error: "internal_error" });
  });

  // Caddy's load balancer polls this to decide which replicas are in rotation.
  app.get("/health", async () => ({ status: "ok", uptime: process.uptime() }));

  await app.register(authRoutes, { prefix: "/v1" });
  await app.register(catalogRoutes, { prefix: "/v1" });
  await app.register(gymRoutes, { prefix: "/v1" });
  await app.register(planRoutes, { prefix: "/v1" });
  await app.register(logRoutes, { prefix: "/v1" });
  await app.register(goalRoutes, { prefix: "/v1" });
  await app.register(coachRoutes, { prefix: "/v1" });
  await app.register(chatRoutes, { prefix: "/v1" });
  await app.register(surveyRoutes, { prefix: "/v1" });
  await app.register(meRoutes, { prefix: "/v1" });
  await app.register(adminRoutes, { prefix: "/v1" });
  await app.register(calendarRoutes, { prefix: "/v1" });

  return app;
}

// Only listen when run directly, so tests can import buildServer().
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()!)) {
  const app = await buildServer();
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
