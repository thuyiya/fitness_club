#!/usr/bin/env node
/**
 * Builds a realistic 14-day history for the demo accounts, entirely through
 * the public API --- so if this script works, the endpoints work.
 *
 *   node scripts/demo-data.mjs
 *
 * Safe to re-run: linking and logging are idempotent or additive-with-skip.
 */
const API = process.env.API_URL ?? "http://localhost:3001";
const PASSWORD = "demo-password-123";

async function call(method, path, { token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}
const login = async (email) => {
  const r = await call("POST", "/v1/auth/login", { body: { email, password: PASSWORD } });
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${JSON.stringify(r.body)}`);
  return { token: r.body.accessToken, id: r.body.user.id };
};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

const coach = await login("coach@demo.test");
const member = await login("member@demo.test");

// --- link them through the real join flow -----------------------------------
let gyms = await call("GET", "/v1/gyms", { token: coach.token });
let gym = gyms.body.items?.[0];
if (!gym) {
  const made = await call("POST", "/v1/gyms", { token: coach.token, body: { name: "Northside Strength", city: "Bristol", capacity: 120 } });
  gym = made.body.gym;
  console.log("  created gym Northside Strength");
}

const roster = await call("GET", "/v1/members", { token: coach.token });
if (!roster.body.items?.some((m) => m.id === member.id)) {
  await call("POST", `/v1/gyms/${gym.id}/join-requests`, { token: member.token, body: { message: "Keen to start" } });
  const pending = await call("GET", `/v1/gyms/${gym.id}/join-requests`, { token: coach.token });
  const req = pending.body.items?.find((r) => r.member.id === member.id);
  if (req) {
    await call("POST", `/v1/join-requests/${req.id}/decide`, { token: coach.token, body: { decision: "approved" } });
    console.log("  linked coach -> member");
  }
} else console.log("  coach/member already linked");

// --- member profile, so targets can be computed ------------------------------
await call("PATCH", "/v1/me", {
  token: member.token,
  body: { sex: "male", heightCm: 178, dateOfBirth: "1992-03-14", activityLevel: "moderately_active", goalType: "muscle_gain" },
});
console.log("  set member profile");

// --- fourteen days of logs ---------------------------------------------------
const catalogue = await Promise.all(
  ["meal_high_protein_oats", "meal_chicken_rice_bowl", "meal_salmon_sweet_potato", "meal_post_workout_shake", "meal_greek_yogurt_parfait"]
    .map((slug) => call("GET", `/v1/meals/${slug}`, { token: member.token })),
);
const mealIds = catalogue.map((r) => r.body.meal).filter(Boolean);

const acts = await call("GET", "/v1/activities?limit=100", { token: member.token });
if (!acts.body.items) throw new Error(`activities lookup failed: ${JSON.stringify(acts.body).slice(0, 200)}`);
const pick = (slug) => acts.body.items.find((a) => a.slug === slug);
const sessions = [pick("sport_strength_training_vigorous"), pick("sport_running_moderate"), pick("sport_cycling_moderate"), pick("sport_squash")].filter(Boolean);

const existing = await call("GET", `/v1/logs/day?date=${iso(dayAgo(0))}`, { token: member.token });
if (existing.body.meals?.length > 0) {
  console.log("  logs already present, skipping history");
} else {
  let logged = 0;
  for (let d = 13; d >= 0; d--) {
    const date = iso(dayAgo(d));
    // Weight trending up slowly, as a muscle-gain goal would.
    await call("POST", "/v1/logs/body-metrics", { token: member.token, body: { date, weightKg: +(78.4 + (13 - d) * 0.06).toFixed(1) } });

    // Three or four meals, fewer at weekends.
    const weekend = [0, 6].includes(dayAgo(d).getDay());
    const count = weekend ? 2 : 3 + (d % 2);
    for (let i = 0; i < count && i < mealIds.length; i++) {
      await call("POST", "/v1/logs/meals", {
        token: member.token,
        body: { date, mealType: ["breakfast", "lunch", "dinner", "snack"][i], mealId: mealIds[i].id, servings: 1 },
      });
      logged++;
    }

    // Trained 5 days in 7.
    if (d % 7 !== 2 && d % 7 !== 5) {
      const s = sessions[d % sessions.length];
      await call("POST", "/v1/logs/activity", {
        token: member.token,
        body: { date, activityId: s.id, durationMinutes: 35 + ((d * 7) % 30) },
      });
    }

    // Hydration in two or three hits.
    for (const ml of [750, 500, weekend ? 0 : 600].filter(Boolean)) {
      await call("POST", "/v1/logs/hydration", { token: member.token, body: { date, amountMl: ml } });
    }
  }
  console.log(`  logged 14 days (${logged} meals, workouts, hydration, weight)`);
}

// --- goals with history, for the dot graph -----------------------------------
const currentGoals = await call("GET", "/v1/goals", { token: member.token });
if ((currentGoals.body.items?.length ?? 0) === 0) {
  const made = [];
  const coachGoal = await call("POST", "/v1/goals", {
    token: coach.token,
    body: { memberId: member.id, title: "Protein 150g daily", metric: "protein_g", targetValue: 150, unit: "g", startDate: iso(dayAgo(13)) },
  });
  made.push({ goal: coachGoal.body.goal, hit: (i) => i % 4 !== 3 });

  const trainGoal = await call("POST", "/v1/goals", {
    token: coach.token,
    body: { memberId: member.id, title: "Train 5x per week", metric: "sessions", targetValue: 1, unit: "sessions", startDate: iso(dayAgo(13)) },
  });
  made.push({ goal: trainGoal.body.goal, hit: (i) => i % 7 !== 2 && i % 7 !== 5 });

  const ownGoal = await call("POST", "/v1/goals", {
    token: member.token,
    body: { title: "Drink 2.5L water", metric: "hydration_ml", targetValue: 2500, unit: "ml", startDate: iso(dayAgo(13)) },
  });
  made.push({ goal: ownGoal.body.goal, hit: (i) => i % 3 !== 0 });

  for (const { goal, hit } of made) {
    for (let d = 13; d >= 0; d--) {
      const i = 13 - d;
      const target = Number(goal.targetValue);
      await call("PUT", `/v1/goals/${goal.id}/entries`, {
        token: member.token,
        body: { date: iso(dayAgo(d)), value: hit(i) ? target + 5 : Math.round(target * 0.7) },
      });
    }
  }
  console.log(`  created ${made.length} goals with 14 days of entries each`);
} else console.log("  goals already present");

// --- a conversation ----------------------------------------------------------
const thread = await call("POST", "/v1/threads/direct", { token: coach.token, body: { userId: member.id } });
if (thread.body.created) {
  const script = [
    [coach, "Morning Alex — strong week. Your protein is landing most days now."],
    [member, "Thanks! The shake after training makes it much easier."],
    [coach, "Good. Let's push the bench to 4x6 next block and keep everything else."],
    [member, "Sounds good. Knee felt fine on Thursday's squats too."],
  ];
  for (const [who, body] of script) {
    await call("POST", `/v1/threads/${thread.body.thread.id}/messages`, { token: who.token, body: { body } });
  }
  console.log("  seeded a conversation");
} else console.log("  thread already exists");

// --- an announcement ---------------------------------------------------------
const anns = await call("GET", "/v1/announcements", { token: coach.token });
if ((anns.body.items?.length ?? 0) === 0) {
  await call("POST", "/v1/announcements", {
    token: coach.token,
    body: { gymId: gym.id, title: "New squat racks", body: "Two new racks are in, and the platform is free from 6am." },
  });
  console.log("  posted an announcement");
}

// --- a plan ------------------------------------------------------------------
const plans = await call("GET", "/v1/plans", { token: coach.token });
if ((plans.body.items?.length ?? 0) === 0) {
  const plan = await call("POST", "/v1/plans", {
    token: coach.token,
    body: { type: "workout", name: "Upper / Lower — Block 2", goal: "Hypertrophy", difficulty: "intermediate", durationWeeks: 6 },
  });
  const day = await call("POST", `/v1/plans/${plan.body.plan.id}/days`, { token: coach.token, body: { dayNumber: 1, title: "Upper push" } });
  const ex = await call("GET", "/v1/exercises?discipline=gym&limit=100", { token: coach.token });
  const find = (slug) => ex.body.items.find((e) => e.slug === slug);
  for (const [slug, sets, reps, kg] of [["ex_barbell_bench_press", 4, 6, 80], ["ex_overhead_press", 3, 8, 45], ["ex_lateral_raise", 3, 12, 10]]) {
    const e = find(slug);
    if (e) await call("POST", `/v1/plan-days/${day.body.day.id}/exercises`, { token: coach.token, body: { exerciseId: e.id, sets, reps, weightKg: kg, restSeconds: 120 } });
  }
  await call("POST", `/v1/plans/${plan.body.plan.id}/assign`, { token: coach.token, body: { memberId: member.id, startDate: iso(dayAgo(7)) } });
  console.log("  created and assigned a plan");
}

const check = await call("GET", `/v1/coach/today?date=${iso(dayAgo(0))}`, { token: coach.token });
console.log(`\n  coach sees ${check.body.members?.length ?? 0} member(s); ${check.body.completed?.length ?? 0} trained today`);
