import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@wellness/db/schema";
import { env } from "./env.js";

const client = postgres(env.DATABASE_URL, { max: env.PG_POOL_MAX });

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema, client };
