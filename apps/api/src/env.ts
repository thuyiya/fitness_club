import { z } from "zod";

/**
 * Fail at boot, not at the first request. A missing JWT secret in production
 * is the difference between "auth is broken" and "auth is forgeable".
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  PG_POOL_MAX: z.coerce.number().default(10),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:");
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;

// A deployment that ships the dev placeholders is a deployment with no auth.
if (env.NODE_ENV === "production") {
  for (const [key, value] of Object.entries({
    JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
  })) {
    if (value.includes("dev_") || value.includes("replace")) {
      console.error(`${key} still holds a development placeholder. Regenerate with: openssl rand -hex 48`);
      process.exit(1);
    }
  }
}
