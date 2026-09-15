#!/usr/bin/env node
/**
 * Chat, surveys, profile targets and admin. Covers the authorization
 * boundaries and the validation that keeps bad data out, not just 200s.
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
  return { token: r.body.accessToken, refresh: r.body.refreshToken, id: r.body.user.id };
};

const coach = await mk("coach", "c2");
const member = await mk("member", "m2");
const outsider = await mk("member", "out2");

// Link them through the real flow.
const gym = await call("POST", "/v1/gyms", { token: coach.token, body: { name: "Comms Gym" } });
await call("POST", `/v1/gyms/${gym.body.gym.id}/join-requests`, { token: member.token, body: {} });
const pend = await call("GET", `/v1/gyms/${gym.body.gym.id}/join-requests`, { token: coach.token });
await call("POST", `/v1/join-requests/${pend.body.items[0].id}/decide`, { token: coach.token, body: { decision: "approved" } });

// --- chat -------------------------------------------------------------------
const t1 = await call("POST", "/v1/threads/direct", { token: coach.token, body: { userId: member.id } });
check("coach opens a direct thread", t1.status === 201 && !!t1.body.thread?.id, JSON.stringify(t1.body).slice(0, 140));
const threadId = t1.body.thread?.id;

const t2 = await call("POST", "/v1/threads/direct", { token: coach.token, body: { userId: member.id } });
check("reopening reuses the same thread", t2.body.thread?.id === threadId && t2.body.created === false,
  `created=${t2.body.created}`);

const stranger = await call("POST", "/v1/threads/direct", { token: outsider.token, body: { userId: coach.id } });
check("unconnected user cannot open a thread (403)", stranger.status === 403, `got ${stranger.status}`);

await call("POST", `/v1/threads/${threadId}/messages`, { token: coach.token, body: { body: "How did the session go?" } });
await call("POST", `/v1/threads/${threadId}/messages`, { token: coach.token, body: { body: "Second message" } });

const intruder = await call("GET", `/v1/threads/${threadId}/messages`, { token: outsider.token });
check("non-participant cannot read messages (404)", intruder.status === 404, `got ${intruder.status}`);

const inbox = await call("GET", "/v1/threads", { token: member.token });
check("member inbox shows 2 unread", inbox.body.items?.[0]?.unreadCount === 2, `unread=${inbox.body.items?.[0]?.unreadCount}`);
check("inbox names the other participant", inbox.body.items?.[0]?.participants?.[0]?.name === "c2");

await call("POST", `/v1/threads/${threadId}/read`, { token: member.token });
const afterRead = await call("GET", "/v1/threads", { token: member.token });
check("marking read clears the count", afterRead.body.items?.[0]?.unreadCount === 0,
  `unread=${afterRead.body.items?.[0]?.unreadCount}`);

const msgs = await call("GET", `/v1/threads/${threadId}/messages`, { token: member.token });
check("messages come back oldest-first", msgs.body.items?.[0]?.body === "How did the session go?");

// --- announcements ----------------------------------------------------------
const ann = await call("POST", "/v1/announcements", {
  token: coach.token, body: { gymId: gym.body.gym.id, title: "Closed Monday", body: "Bank holiday." },
});
check("coach publishes an announcement", ann.status === 201);

const feed = await call("GET", "/v1/announcements", { token: member.token });
check("member sees it as unread", feed.body.unreadCount === 1, `unread=${feed.body.unreadCount}`);
await call("POST", `/v1/announcements/${ann.body.announcement.id}/read`, { token: member.token });
const feed2 = await call("GET", "/v1/announcements", { token: member.token });
check("marking read updates the feed", feed2.body.unreadCount === 0);

// --- surveys ----------------------------------------------------------------
const surveys = await call("GET", "/v1/surveys", { token: coach.token });
check("platform templates are visible", surveys.body.items?.length >= 8, `${surveys.body.items?.length} surveys`);
const template = surveys.body.items.find((s) => s.ownerCoachId === null);

const assignTpl = await call("POST", `/v1/surveys/${template.id}/assign`, {
  token: coach.token, body: { memberId: member.id },
});
check("a shared template cannot be assigned directly", assignTpl.status === 400 && assignTpl.body.error === "template_not_assignable",
  `${assignTpl.status} ${assignTpl.body.error}`);

const cloned = await call("POST", `/v1/surveys/${template.id}/clone`, { token: coach.token });
check("cloning copies the questions", cloned.status === 201 && cloned.body.questionsCloned > 0,
  `${cloned.body.questionsCloned} questions`);

const assigned = await call("POST", `/v1/surveys/${cloned.body.survey.id}/assign`, {
  token: coach.token, body: { memberId: member.id, dueDate: today },
});
check("the clone assigns fine", assigned.status === 201);

const mine = await call("GET", "/v1/surveys/assigned", { token: member.token });
check("member sees the assignment", mine.body.items?.length === 1);

const detail = await call("GET", `/v1/surveys/${cloned.body.survey.id}`, { token: member.token });
const qs = detail.body.questions;

const bad = await call("POST", `/v1/surveys/${cloned.body.survey.id}/responses`, {
  token: member.token,
  body: { cycleDate: today, answers: [{ questionId: qs[0].id, value: "not-a-valid-choice-at-all" }] },
});
check("invalid answers are rejected with reasons", bad.status === 400 && bad.body.error === "answer_validation_failed",
  String(bad.body.message ?? "").slice(0, 110));

// Build a valid answer for every required question, per its type.
const answers = qs.filter((q) => q.required).map((q) => {
  const o = q.options ?? {};
  const value =
    q.type === "single_choice" ? o.choices[0]
    : q.type === "multi_choice" ? [o.choices[0]]
    : q.type === "scale" ? o.min ?? 1
    : q.type === "boolean" ? true
    : q.type === "date" ? today
    : "Some text";
  return { questionId: q.id, value };
});
const submitted = await call("POST", `/v1/surveys/${cloned.body.survey.id}/responses`, {
  token: member.token, body: { cycleDate: today, answers },
});
check("a valid response submits", submitted.status === 201, JSON.stringify(submitted.body).slice(0, 140));

const twice = await call("POST", `/v1/surveys/${cloned.body.survey.id}/responses`, {
  token: member.token, body: { cycleDate: today, answers },
});
check("one response per cycle (409)", twice.status === 409, `got ${twice.status}`);

const read = await call("GET", `/v1/surveys/${cloned.body.survey.id}/responses?memberId=${member.id}`, { token: coach.token });
check("coach reads the answers with prompts", read.body.items?.[0]?.answers?.length === answers.length,
  `${read.body.items?.[0]?.answers?.length} answers`);

// --- profile targets --------------------------------------------------------
const notReady = await call("GET", "/v1/me/targets", { token: member.token });
check("targets report what the profile is missing", notReady.body.ready === false && notReady.body.missing?.length > 0,
  `missing: ${notReady.body.missing?.join(", ")}`);

await call("PATCH", "/v1/me", {
  token: member.token,
  body: { sex: "male", heightCm: 180, dateOfBirth: "1994-05-01", activityLevel: "moderately_active", goalType: "muscle_gain" },
});
await call("POST", "/v1/logs/body-metrics", { token: member.token, body: { date: today, weightKg: 80 } });

const targets = await call("GET", "/v1/me/targets", { token: member.token });
// Mifflin-St Jeor male: 10*80 + 6.25*180 - 5*age + 5 = 1730 at 32 -> *1.55 -> *1.10
const bmr = 10 * 80 + 6.25 * 180 - 5 * 32 + 5;
const expected = Math.round(bmr * 1.55 * 1.1);
check("targets compute from Mifflin-St Jeor + PAL + goal",
  targets.body.ready === true && Math.abs(targets.body.targets.calories - expected) <= 12,
  `got ${targets.body.targets?.calories}, expected ~${expected} (tdee ${targets.body.basis?.tdeeKcal})`);
check("hydration target follows 33ml/kg", targets.body.targets?.hydrationMl === Math.round(80 * 33),
  `got ${targets.body.targets?.hydrationMl}`);
check("without a sport of focus the basis is the goal type", targets.body.targets?.basis === "goal_type");

const profiles = await call("GET", "/v1/sport-profiles", { token: member.token });
const cricket = profiles.body.items.find((p) => p.slug === "sport_profile_cricket");
await call("PATCH", "/v1/me", { token: member.token, body: { sportProfileId: cricket.id } });
const sportTargets = await call("GET", "/v1/me/targets", { token: member.token });
check("a sport of focus replaces the generic split",
  sportTargets.body.targets?.basis === "sport_profile" &&
  sportTargets.body.targets?.carbsG === Math.round(Number(cricket.carbsGain) * 80),
  `carbs ${sportTargets.body.targets?.carbsG}, expected ${Math.round(Number(cricket.carbsGain) * 80)} (${cricket.carbsGain} g/kg x 80kg)`);

// --- admin ------------------------------------------------------------------
const denied = await call("GET", "/v1/admin/overview", { token: coach.token });
check("coach cannot reach admin (403)", denied.status === 403, `got ${denied.status}`);

const admin = await call("POST", "/v1/auth/login", { body: { email: "admin@demo.test", password: "demo-password-123" } });
const at = admin.body.accessToken;

const overview = await call("GET", "/v1/admin/overview", { token: at });
check("admin overview returns live platform counts",
  overview.status === 200 && overview.body.catalog?.foods === 122 && overview.body.catalog?.vectorReady === true,
  JSON.stringify(overview.body.catalog));

const self = await call("POST", `/v1/admin/users/${admin.body.user.id}/role`, { token: at, body: { role: "member" } });
check("admin cannot demote themselves", self.status === 400 && self.body.error === "self_demotion", `got ${self.status}`);

const promoted = await call("POST", `/v1/admin/users/${outsider.id}/role`, { token: at, body: { role: "coach" } });
check("admin promotes a user", promoted.status === 200 && promoted.body.user.role === "coach");

const auditLog = await call("GET", "/v1/admin/audit?limit=5", { token: at });
check("the promotion is audited", auditLog.body.items?.some((a) => a.action === "role_changed" && a.entityId === outsider.id));

// Suspension must kill live sessions, not just flag the row.
const victim = await mk("member", "victim2");
await call("POST", `/v1/admin/users/${victim.id}/status`, { token: at, body: { status: "suspended" } });
// Use the victim's REAL refresh token --- a dummy string would only prove that
// validation rejects short strings, not that the session was revoked.
const canRefresh = await call("POST", "/v1/auth/refresh", { body: { refreshToken: victim.refresh } });
check("suspension revokes the real refresh token", canRefresh.status === 401,
  `got ${canRefresh.status} ${JSON.stringify(canRefresh.body).slice(0, 80)}`);
check("suspended user cannot log in", (await call("POST", "/v1/auth/login", {
  body: { email: `victim2+${stamp}@x.test`, password: "correct-horse-battery-staple" },
})).status === 401);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
