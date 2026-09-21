const { chromium } = require("playwright-core");
const sees = (p, n) => p.locator(`text=${n}`).locator("visible=true").first().isVisible({ timeout: 8000 }).catch(() => false);

(async () => {
  const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 420, height: 900 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  let fail = 0;
  const check = (l, c, d = "") => { if (c) console.log(`  ok    ${l}`); else { fail++; console.log(`  FAIL  ${l}${d ? " -- " + d : ""}`); } };

  await p.goto("http://localhost:8082", { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await p.getByPlaceholder("Email").fill("fresh@demo.test");
  await p.getByPlaceholder("Password").fill("demo-password-123");
  await p.getByText("Sign in", { exact: true }).last().click();
  await p.waitForTimeout(8000);

  check("new member lands in onboarding", new URL(p.url()).pathname === "/onboarding", p.url());
  check("step 1 asks about you", await sees(p, "About you"));
  check("skip is offered", await sees(p, "Skip for now"));
  await p.screenshot({ path: "/tmp/onb-1.png" });

  // Walk it.
  await p.getByText("male", { exact: true }).first().click();
  await p.getByPlaceholder("YYYY-MM-DD").fill("1994-06-12");
  await p.getByText("Continue", { exact: true }).first().click();
  await p.waitForTimeout(1500);
  check("step 2 asks measurements", await sees(p, "Your measurements"));
  await p.getByPlaceholder("178").fill("174");
  await p.getByPlaceholder("78.5").fill("71.5");
  await p.getByText("Continue", { exact: true }).first().click();
  await p.waitForTimeout(1500);
  check("step 3 asks activity", await sees(p, "How active are you"));
  await p.getByText("Moderately active", { exact: true }).first().click();
  await p.getByText("Continue", { exact: true }).first().click();
  await p.waitForTimeout(1500);
  check("step 4 asks the goal", await sees(p, "working towards"));
  await p.getByText("Build muscle", { exact: true }).first().click();
  await p.getByText("Continue", { exact: true }).first().click();
  await p.waitForTimeout(2500);
  check("step 5 offers sport + bio", await sees(p, "SPORT OF FOCUS"));
  await p.screenshot({ path: "/tmp/onb-5.png" });
  await p.getByText("Finish", { exact: true }).first().click();
  await p.waitForTimeout(6000);

  check("finishing lands on member home", new URL(p.url()).pathname === "/member", p.url());
  check("targets now computed (no banner)", !(await sees(p, "Finish your profile")));
  await p.screenshot({ path: "/tmp/onb-done.png" });

  // Theme switch.
  await p.getByText("Settings", { exact: true }).last().click();
  await p.waitForTimeout(3000);
  check("appearance picker present", await sees(p, "APPEARANCE"));
  const before = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await p.getByText("Dark", { exact: true }).first().click();
  await p.waitForTimeout(2000);
  const after = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check("switching to dark repaints the member app", before !== after, `${before} -> ${after}`);
  await p.screenshot({ path: "/tmp/onb-dark.png" });

  console.log(errs.length ? `\n  errors: ${errs.slice(0, 3).join(" | ")}` : "\n  no runtime errors");
  await b.close();
  console.log(fail ? `\n${fail} failed` : "\nall passed");
})();
