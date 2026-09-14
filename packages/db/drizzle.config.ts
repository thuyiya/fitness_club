import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://wellness:wellness@localhost:5432/wellness",
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
