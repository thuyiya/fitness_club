import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * One pool per process. When you scale to several API replicas behind Caddy,
 * total connections = replicas x max, so keep `max` modest and add PgBouncer
 * before raising it.
 */
const client = postgres(connectionString, {
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Db = typeof db;
export { client as pgClient };
