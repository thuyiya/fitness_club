const { chromium } = require("playwright-core");
const sees = (p, n) => p.locator(`text=${n}`).locator("visible=true").first().isVisible({ timeout: 8000 }).catch(() => false);
const login = async (p, email) => {
  await p.goto("http://localhost:8082", { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await p.getByPlaceholder("Email").fill(email);
  await p.getByPlaceholder("Password").fill("demo-password-123");
  await p.getByText("Sign in", { exact: true }).last().click();
  await p.waitForTimeout(8000);
};

(async () => {
  const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  let fail = 0;
  const check = (l, c, d = "") => { if (c) console.log(`  ok    ${l}`); else { fail++; console.log(`  FAIL  ${l}${d ? " -- " + d : ""}`); } };

  const cc = await b.newContext({ viewport: { width: 420, height: 900 } });
  const c = await cc.newPage();
  const cerrs = []; c.on("pageerror", (e) => cerrs.push(e.message));
  await login(c, "coach@demo.test");

  await c.goto("http://localhost:8082/coach", { waitUntil: "networkidle" });
  await c.waitForTimeout(3500);
  await c.getByText("Nadia Fresh", { exact: false }).first().click();
  await c.waitForTimeout(4500);

  check("member profile opens", await sees(c, "PLANS"));
  check("active exercise plan shown", await sees(c, "Foundations"));
  check("it is marked active/scheduled", (await sees(c, "Scheduled")) || (await sees(c, "Active")));
  check("missing meal plan is stated", await sees(c, "No meal plan"));
  check("schedule section shows the booking", await sees(c, "Technique review"));
  check("goal action offered", await sees(c, "Set a goal for Nadia"));
  await c.screenshot({ path: "/tmp/mp-profile.png" });

  // Creating from the empty slot should carry the member through.
  await c.getByText("No meal plan", { exact: true }).first().click();
  await c.waitForTimeout(3500);
  check("empty slot opens the builder", await sees(c, "New meal plan"), c.url());
  check("builder says it will assign", await sees(c, "Will be assigned on save"));
  await c.screenshot({ path: "/tmp/mp-builder.png" });
  await cc.close();

  // The member must actually see the work.
  const mc = await b.newContext({ viewport: { width: 420, height: 900 } });
  const m = await mc.newPage();
  const merrs = []; m.on("pageerror", (e) => merrs.push(e.message));
  await login(m, "fresh@demo.test");
  await m.goto("http://localhost:8082/member/training", { waitUntil: "networkidle" });
  await m.waitForTimeout(4000);
  check("member sees the prescribed work", await sees(m, "Goblet squat"));
  check("it is attributed to the coach", await sees(m, "From your coach"));
  await m.screenshot({ path: "/tmp/mp-member.png" });
  await mc.close();

  console.log([...cerrs, ...merrs].length ? `\n  errors: ${[...cerrs, ...merrs].slice(0, 3).join(" | ")}` : "\n  no runtime errors");
  await b.close();
  console.log(fail ? `\n${fail} failed` : "\nall passed");
})();
