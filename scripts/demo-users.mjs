#!/usr/bin/env node
/**
 * Creates one demo account per role against a running API.
 *   node scripts/demo-users.mjs
 * Idempotent: an existing account is left alone. Admin cannot be created
 * through /auth/register by design, so it is promoted directly in the database.
 */
import { execSync } from "node:child_process";

const API = process.env.API_URL ?? "http://localhost:3001";
const PASSWORD = "demo-password-123";
const ACCOUNTS = [
  { email: "member@demo.test", name: "Alex Rivera", role: "member" },
  { email: "coach@demo.test", name: "Jordan Blake", role: "coach" },
  { email: "admin@demo.test", name: "Sam Okafor", role: "member" },
];

for (const a of ACCOUNTS) {
  const res = await fetch(`${API}/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...a, password: PASSWORD }),
  });
  const label = a.email.padEnd(20);
  if (res.status === 201) console.log(`  created  ${label}`);
  else if (res.status === 409) console.log(`  exists   ${label}`);
  else console.log(`  FAILED   ${label} ${res.status} ${await res.text()}`);
}

// Role promotion is an admin action, never a signup option.
execSync(
  `docker exec wellness-postgres-1 psql -U wellness -d wellness -c "UPDATE users SET role='admin' WHERE email='admin@demo.test'"`,
  { stdio: "pipe" },
);
console.log("  promoted admin@demo.test to admin");
console.log(`\n  password for all three: ${PASSWORD}`);
