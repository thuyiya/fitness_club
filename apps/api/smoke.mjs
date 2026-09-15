#!/usr/bin/env node
/**
 * End-to-end smoke test against a running API.
 *   BASE=http://localhost:3001 node apps/api/smoke.mjs
 * Exercises the full auth flow plus the catalog and recommendation endpoints.
 */
const BASE = process.env.BASE ?? "http://localhost:3001";
let pass = 0, fail = 0;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

function check(label, cond, detail = "") {
  if (cond) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? " -- " + detail : ""}`); }
}

const email = `smoke+${Date.now()}@example.test`;
const password = "correct-horse-battery-staple";

const health = await call("GET", "/health");
check("health responds", health.status === 200 && health.body.status === "ok");

const reg = await call("POST", "/v1/auth/register", { body: { email, password, name: "Smoke Test", role: "coach" } });
check("register returns 201 + tokens", reg.status === 201 && !!reg.body.accessToken, JSON.stringify(reg.body).slice(0, 160));
let token = reg.body.accessToken;

const dupe = await call("POST", "/v1/auth/register", { body: { email, password, name: "Dupe" } });
check("duplicate email rejected (409)", dupe.status === 409);

const weak = await call("POST", "/v1/auth/register", { body: { email: "x@y.test", password: "short", name: "X" } });
check("weak password rejected (400)", weak.status === 400);

const badLogin = await call("POST", "/v1/auth/login", { body: { email, password: "wrong-password-here" } });
check("wrong password rejected (401)", badLogin.status === 401);

const login = await call("POST", "/v1/auth/login", { body: { email, password } });
check("login returns tokens", login.status === 200 && !!login.body.accessToken);
token = login.body.accessToken;

const noAuth = await call("GET", "/v1/exercises");
check("unauthenticated catalog blocked (401)", noAuth.status === 401);

const me = await call("GET", "/v1/auth/me", { token });
check("me returns user without passwordHash", me.status === 200 && me.body.user?.passwordHash === undefined);

const refreshed = await call("POST", "/v1/auth/refresh", { body: { refreshToken: login.body.refreshToken } });
check("refresh issues a new pair", refreshed.status === 200 && !!refreshed.body.accessToken);

const reused = await call("POST", "/v1/auth/refresh", { body: { refreshToken: login.body.refreshToken } });
check("used refresh token is rejected (rotation)", reused.status === 401);

const ex = await call("GET", "/v1/exercises?limit=5", { token });
check("exercise list returns rows", ex.status === 200 && ex.body.items?.length === 5, JSON.stringify(ex.body).slice(0, 120));

const cal = await call("GET", "/v1/exercises?discipline=calisthenics&limit=100", { token });
check("discipline filter works (32 calisthenics)", cal.body.items?.length === 32, `got ${cal.body.items?.length}`);

const bar = await call("GET", "/v1/exercises?equipment=bodyweight,pull_up_bar&movementPattern=vertical_pull&limit=50", { token });
check("equipment subset + pattern compose", bar.status === 200 && bar.body.items?.length > 0,
  `${bar.body.items?.length} results: ${bar.body.items?.map((e) => e.name).join(", ")}`);

const detail = await call("GET", "/v1/exercises/ex_push_up", { token });
check("exercise detail resolves progression chain",
  detail.status === 200 && detail.body.progressions?.length > 0,
  `progressions: ${detail.body.progressions?.map((p) => p.name).join(", ")}`);

const acts = await call("GET", "/v1/activities?kind=training_session", { token });
check("activities filter by kind (7 gym proxies)", acts.body.items?.length === 7, `got ${acts.body.items?.length}`);

const profiles = await call("GET", "/v1/sport-profiles", { token });
check("sport profiles seeded (22)", profiles.body.items?.length === 22, `got ${profiles.body.items?.length}`);

const foods = await call("GET", "/v1/foods?excludeAllergens=peanuts,milk&dietaryTags=vegan&limit=100", { token });
const leaked = foods.body.items?.filter((f) => f.allergens.includes("peanuts") || f.allergens.includes("milk")) ?? [];
check("allergen exclusion is absolute", foods.status === 200 && leaked.length === 0,
  `${foods.body.items?.length} vegan foods, ${leaked.length} leaked`);

const rec = await call("POST", "/v1/recommend/meals", {
  token,
  body: { calories: 450, proteinG: 40, carbsG: 35, fatG: 15, excludeAllergens: ["peanuts"], requireTags: ["gluten_free"], limit: 3 },
});
const top = rec.body.items?.[0];
check("macro recommender returns scaled matches", rec.status === 200 && !!top,
  top ? `${top.name} @ ${top.servings}x -> ${top.proteinG}P/${top.carbsG}C/${top.fatG}F (d=${top.distance})` : JSON.stringify(rec.body).slice(0, 200));
check("recommender respects allergen constraint",
  (rec.body.items ?? []).every((m) => !m.allergens.includes("peanuts")));

const search = await call("GET", "/v1/search?q=yogurt&type=foods", { token });
check("trigram search finds fuzzy matches", search.status === 200 && search.body.items?.length > 0,
  `mode=${search.body.mode}, hits: ${search.body.items?.map((i) => i.name).join(" | ")}`);


// --- search quality -------------------------------------------------------
// These encode intent, not just "returns 200". A typo must find the food, and
// a described need must find the meal; regressing either is a product bug.
const vectorOn = (await call("GET", "/v1/foods?limit=1", { token })).body.semanticAvailable;
console.log(`  ---   pgvector ${vectorOn ? "installed" : "NOT installed (semantic checks skipped)"}`);

const typo = await call("GET", "/v1/search?q=chiken&type=foods&mode=hybrid&limit=3", { token });
check("typo 'chiken' ranks Chicken first, not Chia",
  typo.body.items?.[0]?.name?.startsWith("Chicken"),
  typo.body.items?.map((i) => i.name).join(" | "));

const typo2 = await call("GET", "/v1/search?q=yogrt&type=foods&mode=lexical&limit=3", { token });
check("typo 'yogrt' matches via word_similarity", typo2.body.items?.[0]?.name?.includes("yogurt"),
  typo2.body.items?.map((i) => i.name).join(" | "));

if (vectorOn) {
  const nl = await call("GET", "/v1/search?q=" + encodeURIComponent("food for after a hard workout") + "&type=meals&limit=3", { token });
  check("natural language finds the post-workout meal",
    nl.body.items?.[0]?.name?.toLowerCase().includes("post-workout"),
    nl.body.items?.map((i) => i.name).join(" | "));

  const lex = await call("GET", "/v1/search?q=" + encodeURIComponent("food for after a hard workout") + "&type=meals&mode=lexical", { token });
  check("...which lexical search alone cannot find", (lex.body.items?.length ?? 0) === 0,
    `lexical returned ${lex.body.items?.length}`);

  const macroish = await call("GET", "/v1/search?q=" + encodeURIComponent("low carb high protein dinner") + "&type=meals&limit=3", { token });
  check("described macros find a matching meal", (macroish.body.items?.length ?? 0) > 0,
    macroish.body.items?.map((i) => i.name).join(" | "));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
