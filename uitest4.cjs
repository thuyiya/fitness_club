const { chromium } = require("playwright-core");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sees = (p, n) => p.locator(`text=${n}`).locator("visible=true").first().isVisible({ timeout: 9000 }).catch(() => false);
const openPlus = (p) => p.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find((e) => { const r = e.getBoundingClientRect(); return Math.round(r.width) === 56 && Math.round(r.height) === 56 && r.top > 700; });
  let n = el; while (n && n.getAttribute("role") !== "button" && n.tagName !== "BUTTON") n = n.parentElement;
  (n || el)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage({ viewport: { width: 420, height: 900 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  let fail = 0;
  const check = (l, c, d = "") => { if (c) console.log(`  ok    ${l}`); else { fail++; console.log(`  FAIL  ${l}${d ? " -- " + d : ""}`); } };

  await p.goto("http://localhost:8081", { waitUntil: "networkidle" });
  await p.waitForTimeout(2000);
  await p.getByPlaceholder("Email").fill("coach@demo.test");
  await p.getByPlaceholder("Password").fill("demo-password-123");
  await p.getByText("Sign in", { exact: true }).last().click();
  await p.waitForTimeout(7000);

  await openPlus(p);
  await p.waitForTimeout(2000);
  check("coach + opens the create sheet", await sees(p, "New workout plan"));
  check("sheet offers member search", await sees(p, "Find a member"));
  check("sheet offers meal plans and templates", (await sees(p, "New meal plan")) && (await sees(p, "Templates")));
  await p.screenshot({ path: "/tmp/c-sheet.png" });

  await p.getByText("Find a member", { exact: true }).first().click();
  await p.waitForTimeout(2500);
  check("member search lists the roster", await sees(p, "Alex Rivera"));
  await p.screenshot({ path: "/tmp/c-members.png" });

  // Build a workout plan end to end.
  await p.goto("http://localhost:8081/coach/plan?type=workout", { waitUntil: "networkidle" });
  await p.waitForTimeout(3500);
  check("plan builder opens", await sees(p, "New workout plan"));
  await p.getByPlaceholder(/Plan name/).fill("Test Block A");
  await p.getByText("Save", { exact: true }).first().click();
  await p.waitForTimeout(3500);
  check("saving creates the plan and reveals day tabs", await sees(p, "WEEK 1"), p.url());
  await p.screenshot({ path: "/tmp/c-plan.png" });

  check("template + assign actions present", (await sees(p, "Save as template")) && (await sees(p, "Assign")));

  await p.goto("http://localhost:8081/coach/templates", { waitUntil: "networkidle" });
  await p.waitForTimeout(3000);
  check("templates screen lists saved templates", await sees(p, "Upper/Lower"));
  await p.screenshot({ path: "/tmp/c-templates.png" });

  console.log(errs.length ? `\n  errors: ${errs.slice(0, 3).join(" | ")}` : "\n  no runtime errors");
  await b.close();
  console.log(fail ? `\n${fail} failed` : "\nall passed");
})();
