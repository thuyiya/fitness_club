import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";

/**
 * Scaffold only --- no business routes yet, by design.
 * /health exists because Caddy's load balancer polls it to decide which
 * replicas are in rotation.
 */
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
  },
  // Behind Caddy, so trust the proxy headers for client IPs / rate limiting.
  trustProxy: true,
});

await app.register(helmet);
await app.register(cors, { origin: true });
await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

app.get("/health", async () => ({ status: "ok", uptime: process.uptime() }));

const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`api listening on :${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
