const { chromium } = require("playwright-core");

const sees = (p, n) => p.locator(`text=${n}`).locator("visible=true").first().isVisible({ timeout: 8000 }).catch(() => false);
const gone = async (p, n) => !(await p.locator(`text=${n}`).locator("visible=true").first().isVisible({ timeout: 1500 }).catch(() => false));

// RN Web keeps every mounted tab screen in the DOM, so an unqualified text
// locator can resolve to a copy on a screen that is not on top. Always click
// the visible one.
const tap = (p, n, exact = true) => p.getByText(n, { exact }).locator("visible=true").first().click();

/**
 * Click the copy of a label that is actually on top.
 *
 * A screen left mounted underneath keeps its own laid-out copy of the same
 * text, and Playwright's first visible match can be that one --- which then
 * "intercepts pointer events" because the real hit test lands elsewhere. This
 * picks the node the browser itself would hand the click to.
 */
const tapHit = async (p, text) => {
  const point = await p.evaluate((t) => {
    const nodes = [...document.querySelectorAll("div")].filter((d) => d.textContent === t && !d.children.length);
    for (const n of nodes) {
      const r = n.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      if (document.elementFromPoint(x, y) === n) return { x, y };
    }
    return null;
  }, text);
  if (!point) throw new Error(`nothing tappable reads "${text}"`);
  await p.mouse.click(point.x, point.y);
};

const login = async (p, email) => {
  await p.goto("http://localhost:8082", { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await p.getByPlaceholder("Email").fill(email);
  await p.getByPlaceholder("Password").fill("demo-password-123");
  await p.getByText("Sign in", { exact: true }).last().click();
  await p.waitForTimeout(8000);
};

const iso = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

(async () => {
  // The member id, so the builder can be opened the way a coach reaches it.
  const auth = await fetch("http://localhost:3001/v1/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "coach@demo.test", password: "demo-password-123" }),
  }).then((r) => r.json());
  const roster = await fetch("http://localhost:3001/v1/members", {
    headers: { authorization: `Bearer ${auth.accessToken}` },
  }).then((r) => r.json());
  const target = roster.items[0];

  const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  let fail = 0;
  const check = (l, c, d = "") => { if (c) console.log(`  ok    ${l}`); else { fail++; console.log(`  FAIL  ${l}${d ? " -- " + d : ""}`); } };

  const cc = await b.newContext({ viewport: { width: 420, height: 900 } });
  const c = await cc.newPage();
  const cerrs = []; c.on("pageerror", (e) => cerrs.push(e.message));
  await login(c, "coach@demo.test");

  // ---- the "+" sheet is down to one action -------------------------------
  await c.goto("http://localhost:8082/coach", { waitUntil: "networkidle" });
  await c.waitForTimeout(3000);
  await c.locator('[role="button"]').filter({ has: c.locator("svg") }).nth(0).waitFor({ timeout: 5000 }).catch(() => {});
  // The centre + is the only tab button with no label.
  await c.locator("div.css-view-g5y9jx").first().waitFor({ timeout: 3000 }).catch(() => {});
  await c.getByText("Progress", { exact: true }).first().waitFor({ timeout: 5000 });
  const tabs = c.locator('[tabindex="0"]');
  // Tap the plus by position: it sits between Progress and Chat.
  const box = await c.getByText("Progress", { exact: true }).first().boundingBox();
  const chat = await c.getByText("Chat", { exact: true }).first().boundingBox();
  await c.mouse.click((box.x + box.width / 2 + chat.x + chat.width / 2) / 2, box.y);
  await c.waitForTimeout(1200);

  check("sheet offers Find a member", await sees(c, "Find a member"));
  check("New workout plan removed", await gone(c, "New workout plan"));
  check("New meal plan removed", await gone(c, "New meal plan"));
  check("Templates removed", await gone(c, "Templates"));
  check("Book a session removed", await gone(c, "Book a session"));
  await c.screenshot({ path: "/tmp/pg-sheet.png" });

  // ---- it closes, then navigates to a real page --------------------------
  await tap(c, "Find a member");
  await c.waitForTimeout(2500);
  check("navigates to the members page", c.url().includes("/coach/members"), c.url());
  check("member search is a page, not a modal", await gone(c, "Find a member"));
  check("search field is offered", await c.getByPlaceholder("Search by name or email").isVisible().catch(() => false));

  await c.getByPlaceholder("Search by name or email").fill(target.name.slice(0, 3));
  await c.waitForTimeout(900);
  check("search matches a member", await sees(c, target.name));
  await c.getByPlaceholder("Search by name or email").fill("zzqq");
  await c.waitForTimeout(900);
  check("search reports no match", await sees(c, "Nobody matches"));
  await c.getByPlaceholder("Search by name or email").fill("");
  await c.waitForTimeout(900);
  await c.screenshot({ path: "/tmp/pg-members.png" });

  check("tapping a member opens their profile", await (async () => {
    await tapHit(c, target.name);
    await c.waitForTimeout(3500);
    return c.url().includes("/coach/member/");
  })());

  // ---- the dated block builder -------------------------------------------
  await c.goto(`http://localhost:8082/coach/program?assignTo=${target.id}`, { waitUntil: "networkidle" });
  await c.waitForTimeout(3500);
  check("builder opens on a date range", await sees(c, "Dates"));
  check("it names who it is for", await sees(c, `Will be assigned to ${target.name.split(" ")[0]}`));

  await c.getByLabel("Block name").fill("Browser block");
  // start is today by default; one tap on +3 closes the range.
  await c.getByLabel(iso(3)).first().click();
  await c.waitForTimeout(1200);
  check("range of 4 days generates 4 cards", await sees(c, "4 days"));
  check("every card starts as a rest day", await sees(c, "Rest day"));
  check("the split is counted", await sees(c, "0 with work"));
  await c.screenshot({ path: "/tmp/pg-range.png" });

  // ---- add a sport to the first day --------------------------------------
  const firstDay = new Date();
  const firstLabel = firstDay.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" });
  await c.getByLabel(`Add work to ${firstLabel}`).first().click();
  await c.waitForTimeout(1200);
  check("the day sheet asks sport or workout", (await sees(c, "Sport")) && (await sees(c, "Workout")));
  await c.screenshot({ path: "/tmp/pg-choose.png" });

  await tap(c, "Sport");
  await c.waitForTimeout(1500);
  await c.getByPlaceholder("Search sports").fill("football");
  await c.waitForTimeout(2000);
  check("sports are searchable", await sees(c, "Football"));
  await tap(c, "Football", false);
  await c.waitForTimeout(1200);
  check("a sport asks duration, not reps", (await sees(c, "How long")) && (await gone(c, "Reps")));
  check("a sport asks intensity", await sees(c, "Intensity"));
  await c.getByLabel("Minutes").fill("75");
  await tap(c, "vigorous");
  await tap(c, "Add to day");
  await c.waitForTimeout(1500);
  check("the sport lands on the day", await sees(c, "75 min"));
  check("the day is no longer rest", await sees(c, "1 with work"));
  await c.screenshot({ path: "/tmp/pg-sport.png" });

  // ---- add a workout to the second day -----------------------------------
  const second = new Date(); second.setDate(second.getDate() + 1);
  const secondLabel = second.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" });
  await c.getByLabel(`Add work to ${secondLabel}`).first().click();
  await c.waitForTimeout(1200);
  await tap(c, "Workout");
  await c.waitForTimeout(1800);
  await c.getByPlaceholder("Search the exercise library").fill("goblet");
  await c.waitForTimeout(2200);
  await tap(c, "Goblet squat", false);
  await c.waitForTimeout(1200);
  check("a workout asks sets and reps", (await sees(c, "Sets")) && (await sees(c, "Reps")));
  await c.getByLabel("Sets").fill("5");
  await c.getByLabel("Reps").fill("6");
  await tap(c, "Add to day");
  await c.waitForTimeout(1500);
  check("the workout lands on its own day", await sees(c, "5 × 6"));
  check("two days now carry work", await sees(c, "2 with work"));
  await c.screenshot({ path: "/tmp/pg-workout.png" });

  await tap(c, "Save");
  await c.waitForTimeout(4000);
  check("saving confirms both calendars", await sees(c, "Saved"));

  // ---- the coach's own calendar -------------------------------------------
  await c.goto("http://localhost:8082/coach/calendar", { waitUntil: "networkidle" });
  await c.waitForTimeout(4000);
  check("coach calendar shows the prescribed day", await sees(c, "Prescribed"));
  check("coach calendar names the member", await sees(c, target.name));
  await c.screenshot({ path: "/tmp/pg-coachcal.png" });
  await cc.close();

  // ---- the member's side --------------------------------------------------
  const mc = await b.newContext({ viewport: { width: 420, height: 900 } });
  const m = await mc.newPage();
  const merrs = []; m.on("pageerror", (e) => merrs.push(e.message));
  await login(m, target.email);
  await m.goto("http://localhost:8082/member/training", { waitUntil: "networkidle" });
  await m.waitForTimeout(4500);
  check("member sees the sport today", await sees(m, "Football"));
  check("with its duration and effort", await sees(m, "vigorous"));
  await m.screenshot({ path: "/tmp/pg-member-today.png" });

  await m.goto("http://localhost:8082/member/calendar", { waitUntil: "networkidle" });
  await m.waitForTimeout(4000);
  check("member calendar shows the block", await sees(m, "Browser block"));
  await m.screenshot({ path: "/tmp/pg-membercal.png" });
  await mc.close();

  console.log([...cerrs, ...merrs].length ? `\n  errors: ${[...cerrs, ...merrs].slice(0, 3).join(" | ")}` : "\n  no runtime errors");
  await b.close();
  console.log(fail ? `\n${fail} failed` : "\nall passed");
})();
