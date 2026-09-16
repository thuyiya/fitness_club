const { chromium } = require("playwright-core");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sees = (p, n) => p.locator(`text=${n}`).locator("visible=true").first().isVisible({ timeout: 9000 }).catch(() => false);

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  let fail = 0;
  const check = (l, c, d = "") => { if (c) console.log(`  ok    ${l}`); else { fail++; console.log(`  FAIL  ${l}${d ? " -- " + d : ""}`); } };

  await p.goto("http://localhost:8081", { waitUntil: "networkidle" });
  await p.waitForTimeout(2000);
  await p.getByPlaceholder("Email").fill("member@demo.test");
  await p.getByPlaceholder("Password").fill("demo-password-123");
  await p.getByText("Sign in", { exact: true }).last().click();
  await p.waitForTimeout(7000);

  check("'remaining targets' strip is gone", !(await sees(p, "TO HIT YOUR REMAINING TARGETS")));
  check("alerts strip shows what changed", await sees(p, "Upper body session"));
  check("day timeline replaces the flat list", await sees(p, "YOUR DAY"));
  await p.screenshot({ path: "/tmp/r-home.png", fullPage: false });

  // Timeline must be in time order.
  const order = await p.evaluate(() => {
    const txt = document.body.innerText;
    const times = [...txt.matchAll(/\b([01]\d|2[0-3]):([0-5]\d)\b/g)].map((m) => m[0]);
    return times.slice(0, 8);
  });
  const sorted = [...order].sort();
  check("entries are sorted by time", JSON.stringify(order) === JSON.stringify(sorted), order.join(" "));

  check("meal slot cards present", await sees(p, "Breakfast"));
  check("suggestions render under a slot", await sees(p, "Suggested"));

  // Tap + on a meal slot -> builder page.
  await p.evaluate(() => {
    const els = [...document.querySelectorAll("*")];
    const dinner = els.find((e) => e.textContent?.trim() === "Dinner");
    let card = dinner;
    while (card && card.getBoundingClientRect().width < 300) card = card.parentElement;
    const btn = [...(card?.querySelectorAll("*") ?? [])].find((e) => Math.round(e.getBoundingClientRect().width) === 34);
    btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await p.waitForTimeout(3000);
  check("+ opens the meal builder", await sees(p, "Ingredients"), p.url());
  check("builder offers meals and ingredients tabs", await sees(p, "Meals"));

  await p.getByPlaceholder(/Search meals/).fill("oats");
  await p.waitForTimeout(2500);
  check("builder searches meals", await sees(p, "High-protein oats"));
  await p.getByText("High-protein oats", { exact: false }).first().click();
  await p.waitForTimeout(1200);
  check("adding builds a plate with a total", await sees(p, "Log dinner"));
  await p.screenshot({ path: "/tmp/r-builder.png" });

  console.log(errors.length ? `\n  errors: ${errors.slice(0, 3).join(" | ")}` : "\n  no runtime errors");
  await b.close();
  console.log(fail ? `\n${fail} failed` : "\nall passed");
})();
