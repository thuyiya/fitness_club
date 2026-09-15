import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { ZodError } from "zod";
import { env } from "./env.js";
import { ApiError } from "./errors.js";
import { authPlugin } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { catalogRoutes } from "./routes/catalog.js";

export async function buildServer() {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    // Behind Caddy, so trust the proxy headers for client IPs / rate limiting.
    trustProxy: true,
  });

  await app.register(helmet);
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
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
    // Anything unrecognised is logged in full and reported as a bare 500 ---
    // never echo an internal message to the client.
    req.log.error({ err: error }, "unhandled error");
    return reply.code(500).send({ error: "internal_error" });
  });

  // Caddy's load balancer polls this to decide which replicas are in rotation.
  app.get("/health", async () => ({ status: "ok", uptime: process.uptime() }));

  await app.register(authRoutes, { prefix: "/v1" });
  await app.register(catalogRoutes, { prefix: "/v1" });

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
