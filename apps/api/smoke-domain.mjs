#!/usr/bin/env node
/**
 * Exercises the coach's working loop: gym -> join request -> roster -> plan ->
 * assignment -> logging -> goals -> the coach home aggregate.
 * Also asserts the authorization boundaries, which are the part that matters.
 */
const BASE = process.env.BASE ?? "http://localhost:3001";
let pass = 0, fail = 0;
const today = new Date().toISOString().slice(0, 10);

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}
const check = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? " -- " + detail : ""}`); }
};

const stamp = Date.now();
const mk = async (role, tag) => {
  const r = await call("POST", "/v1/auth/register", {
    body: { email: `${tag}+${stamp}@x.test`, password: "correct-horse-battery-staple", name: tag, role },
  });
  return { token: r.body.accessToken, id: r.body.user.id };
};

const coach = await mk("coach", "coach");
const other = await mk("coach", "rival");
const member = await mk("member", "member");
const stranger = await mk("member", "stranger");

// --- gym and roster ---------------------------------------------------------
const gym = await call("POST", "/v1/gyms", { token: coach.token, body: { name: "Iron Works", city: "Bristol" } });
check("coach creates a gym", gym.status === 201 && !!gym.body.gym?.id, JSON.stringify(gym.body).slice(0, 120));
const gymId = gym.body.gym?.id;

const memberMakesGym = await call("POST", "/v1/gyms", { token: member.token, body: { name: "Nope" } });
check("member cannot create a gym (403)", memberMakesGym.status === 403);

const jr = await call("POST", `/v1/gyms/${gymId}/join-requests`, { token: member.token, body: { message: "Hi" } });
check("member requests to join", jr.status === 201);

const dupe = await call("POST", `/v1/gyms/${gymId}/join-requests`, { token: member.token });
check("duplicate pending request rejected (409)", dupe.status === 409, `got ${dupe.status}`);

const rivalPeeks = await call("GET", `/v1/gyms/${gymId}/join-requests`, { token: other.token });
check("rival coach cannot read another gym's requests", rivalPeeks.status === 403 || rivalPeeks.status === 404, `got ${rivalPeeks.status}`);

const pending = await call("GET", `/v1/gyms/${gymId}/join-requests`, { token: coach.token });
check("owner sees the pending request", pending.body.items?.length === 1);

const decided = await call("POST", `/v1/join-requests/${pending.body.items[0].id}/decide`, {
  token: coach.token, body: { decision: "approved" },
});
check("approval succeeds", decided.status === 200 && decided.body.decision === "approved");

const roster = await call("GET", "/v1/members", { token: coach.token });
check("approval opens the coach-member link", roster.body.items?.some((m) => m.id === member.id),
  `roster: ${roster.body.items?.map((m) => m.name).join(", ")}`);

// --- authorization boundary -------------------------------------------------
const peek = await call("GET", `/v1/logs/day?date=${today}&memberId=${member.id}`, { token: other.token });
check("coach cannot read a member they do not hold (404)", peek.status === 404, `got ${peek.status}`);

const mine = await call("GET", `/v1/logs/day?date=${today}&memberId=${member.id}`, { token: coach.token });
check("their own coach can read them", mine.status === 200);

const strangerPeek = await call("GET", `/v1/logs/day?date=${today}&memberId=${member.id}`, { token: stranger.token });
check("a member cannot read another member (403/404)", [403, 404].includes(strangerPeek.status), `got ${strangerPeek.status}`);

// --- plans ------------------------------------------------------------------
const plan = await call("POST", "/v1/plans", { token: coach.token, body: { type: "workout", name: "Upper A", difficulty: "intermediate" } });
check("coach creates a plan", plan.status === 201);
const planId = plan.body.plan?.id;

const day = await call("POST", `/v1/plans/${planId}/days`, { token: coach.token, body: { dayNumber: 1, title: "Push" } });
check("plan gains a day", day.status === 201);
const dayId = day.body.day?.id;

const exList = await call("GET", "/v1/exercises?discipline=gym&limit=50", { token: coach.token });
const bench = exList.body.items.find((e) => e.slug === "ex_barbell_bench_press");
const plank = exList.body.items.find((e) => e.loggingMode === "hold")
  ?? (await call("GET", "/v1/exercises?limit=100", { token: coach.token })).body.items.find((e) => e.loggingMode === "hold");

const addBench = await call("POST", `/v1/plan-days/${dayId}/exercises`, {
  token: coach.token, body: { exerciseId: bench.id, sets: 4, reps: 8, weightKg: 80, restSeconds: 120 },
});
check("prescribes a rep-based exercise", addBench.status === 201, JSON.stringify(addBench.body).slice(0, 120));

const badPlank = await call("POST", `/v1/plan-days/${dayId}/exercises`, {
  token: coach.token, body: { exerciseId: plank.id, sets: 3, reps: 10 },
});
check("rejects reps on a timed hold", badPlank.status === 400 && badPlank.body.error === "logging_mode_mismatch",
  `${plank.name}: ${badPlank.status} ${badPlank.body.error}`);

const goodPlank = await call("POST", `/v1/plan-days/${dayId}/exercises`, {
  token: coach.token, body: { exerciseId: plank.id, sets: 3, durationSeconds: 45 },
});
check("accepts seconds on a timed hold", goodPlank.status === 201);

const rivalEdits = await call("POST", `/v1/plans/${planId}/days`, { token: other.token, body: { dayNumber: 2 } });
check("rival coach cannot edit the plan (403)", rivalEdits.status === 403, `got ${rivalEdits.status}`);

const tree = await call("GET", `/v1/plans/${planId}`, { token: coach.token });
check("plan tree returns days with exercises", tree.body.days?.[0]?.exercises?.length === 2,
  `${tree.body.days?.[0]?.exercises?.length} exercises`);

const assign = await call("POST", `/v1/plans/${planId}/assign`, {
  token: coach.token, body: { memberId: member.id, startDate: today },
});
check("assigns the plan to the member", assign.status === 201);

const badAssign = await call("POST", `/v1/plans/${planId}/assign`, {
  token: coach.token, body: { memberId: stranger.id, startDate: today },
});
check("cannot assign to someone else's member (404)", badAssign.status === 404, `got ${badAssign.status}`);

const assigned = await call("GET", "/v1/assignments", { token: member.token });
check("member sees their assignment", assigned.body.items?.[0]?.plan?.name === "Upper A");

// --- logging ----------------------------------------------------------------
await call("POST", "/v1/logs/body-metrics", { token: member.token, body: { date: today, weightKg: 82 } });

const meals = await call("GET", "/v1/meals/meal_chicken_rice_bowl", { token: member.token });
const logMeal = await call("POST", "/v1/logs/meals", {
  token: member.token, body: { date: today, mealType: "lunch", mealId: meals.body.meal.id, servings: 1 },
});
check("logs a catalog meal with copied macros", logMeal.status === 201 && Number(logMeal.body.mealLog.proteinG) > 30,
  `protein ${logMeal.body.mealLog?.proteinG}`);

const acts = await call("GET", "/v1/activities?kind=sport&limit=100", { token: member.token });
const squash = acts.body.items.find((a) => a.slug === "sport_squash");
const logAct = await call("POST", "/v1/logs/activity", {
  token: member.token, body: { date: today, activityId: squash.id, durationMinutes: 50 },
});
// kcal = MET * 3.5 * kg / 200 * min = 12 * 3.5 * 82 / 200 * 50
const expected = Math.round((Number(squash.met) * 3.5 * 82) / 200 * 50);
check("activity calories use MET and the member's own weight",
  logAct.status === 201 && logAct.body.workoutLog.caloriesBurned === expected,
  `got ${logAct.body.workoutLog?.caloriesBurned}, expected ${expected} (MET ${squash.met}, 82kg)`);

await call("POST", "/v1/logs/hydration", { token: member.token, body: { date: today, amountMl: 750 } });
await call("POST", "/v1/logs/hydration", { token: member.token, body: { date: today, amountMl: 500 } });

const dayView = await call("GET", `/v1/logs/day?date=${today}`, { token: member.token });
check("day view aggregates hydration", dayView.body.hydration?.totalMl === 1250, `got ${dayView.body.hydration?.totalMl}`);
check("day view totals the macros", dayView.body.totals?.calories > 0 && dayView.body.totals?.proteinG > 30,
  JSON.stringify(dayView.body.totals));

// --- goals ------------------------------------------------------------------
const goal = await call("POST", "/v1/goals", {
  token: coach.token,
  body: { memberId: member.id, title: "Protein 150g", metric: "protein_g", targetValue: 150, startDate: today },
});
check("coach sets a goal for their member", goal.status === 201 && goal.body.goal.source === "coach",
  `source=${goal.body.goal?.source}`);

const ownGoal = await call("POST", "/v1/goals", {
  token: member.token, body: { title: "Walk 8000 steps", metric: "steps", targetValue: 8000, startDate: today },
});
check("member's own goal is marked personal", ownGoal.body.goal?.source === "personal");

const forged = await call("POST", "/v1/goals", {
  token: member.token,
  body: { memberId: stranger.id, title: "Forged", metric: "steps", targetValue: 1, startDate: today },
});
check("member cannot set a goal on someone else (403)", forged.status === 403, `got ${forged.status}`);

const hit = await call("PUT", `/v1/goals/${goal.body.goal.id}/entries`, { token: member.token, body: { date: today, value: 160 } });
check("goal entry computes achievement server-side", hit.body.entry?.achieved === true, JSON.stringify(hit.body.entry));

const miss = await call("PUT", `/v1/goals/${goal.body.goal.id}/entries`, { token: member.token, body: { date: today, value: 90 } });
check("re-submitting the same day corrects, not duplicates", miss.body.entry?.achieved === false);

const goalList = await call("GET", `/v1/goals?memberId=${member.id}`, { token: coach.token });
check("goals come back with dot-graph entries", goalList.body.items?.length === 2 && goalList.body.items.some((g) => g.entries.length === 1),
  `${goalList.body.items?.length} goals`);

// --- coach home -------------------------------------------------------------
const homeFeed = await call("GET", `/v1/coach/today?date=${today}`, { token: coach.token });
const row = homeFeed.body.members?.find((m) => m.id === member.id);
check("coach home shows the member as trained today", row?.done === true, JSON.stringify(row ?? homeFeed.body).slice(0, 200));
check("coach home carries the member's day stats", row?.hydrationMl === 1250 && row?.kcalIn > 0,
  `hydration ${row?.hydrationMl}, kcal ${row?.kcalIn}, protein ${row?.proteinG}`);

const revenue = await call("GET", "/v1/coach/revenue", { token: coach.token });
check("revenue endpoint responds", revenue.status === 200 && Array.isArray(revenue.body.series));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
