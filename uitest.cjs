const { chromium } = require("playwright-core");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * React Native Web keeps every tab screen mounted, so document.body.innerText
 * returns all of them concatenated. Assertions must therefore go through
 * Playwright's visibility filter, not a text dump of the page.
 */
const sees = (page, needle) =>
  page.locator(`text=${needle}`).locator("visible=true").first().isVisible({ timeout: 8000 }).catch(() => false);

async function goTo(page, tab, expect) {
  await page.getByText(tab, { exact: true }).last().click();
  await page.waitForFunction(
    (n) => [...document.querySelectorAll("*")].some((el) => el.textContent?.includes(n) && el.getBoundingClientRect().width > 0),
    expect,
    { timeout: 20000 },
  ).catch(() => {});
  await page.waitForTimeout(800);
}

async function signIn(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:8081", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("demo-password-123");
  await page.getByText("Sign in", { exact: true }).last().click();
  await page.waitForTimeout(5500);
  return { ctx, page, errors };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  let fail = 0;
  const check = (label, cond, detail = "") => {
    if (cond) console.log(`  ok    ${label}`);
    else { fail++; console.log(`  FAIL  ${label}${detail ? " -- " + detail : ""}`); }
  };

  {
    const { ctx, page, errors } = await signIn(browser, "member@demo.test");
    check("member home renders live totals", await sees(page, "TODAY'S SUMMARY"));
    check("recommendations adapt to what is left", await sees(page, "TO HIT YOUR REMAINING TARGETS"));
    check("training section shows the logged session", await sees(page, "kcal burned across"));
    await page.screenshot({ path: "/tmp/s-member-home.png" });

    await goTo(page, "Progress", "Hydration");
    check("progress renders hydration chart", await sees(page, "Hydration"));
    check("goal dot graph has real history", await sees(page, "days met"));
    check("goals distinguish coach from personal", (await sees(page, "From coach")) && (await sees(page, "Personal")));
    await page.screenshot({ path: "/tmp/s-member-progress.png" });

    await goTo(page, "Settings", "DAILY TARGETS");
    check("settings shows server-computed targets", await sees(page, "DAILY TARGETS"));
    check("targets explain their basis", await sees(page, "TDEE"));
    await page.screenshot({ path: "/tmp/s-member-settings.png" });

    await goTo(page, "Chat", "Jordan");
    check("chat inbox lists the conversation", await sees(page, "Jordan Blake"));
    await page.screenshot({ path: "/tmp/s-member-chat.png" });

    check("no runtime errors (member)", errors.length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  {
    const { ctx, page, errors } = await signIn(browser, "coach@demo.test");
    check("coach home shows the real roster", await sees(page, "Alex Rivera"));
    check("coach home counts completed sessions", await sees(page, "completed"));
    await page.screenshot({ path: "/tmp/s-coach-home.png" });

    await goTo(page, "Progress", "Revenue");
    check("coach progress is honest about no payments", await sees(page, "No payments recorded yet"));
    await page.screenshot({ path: "/tmp/s-coach-progress.png" });

    await goTo(page, "Settings", "Northside");
    check("coach settings lists the gym", await sees(page, "Northside Strength"));
    check("coach settings lists the plan", await sees(page, "Upper / Lower"));
    await page.screenshot({ path: "/tmp/s-coach-settings.png" });

    check("no runtime errors (coach)", errors.length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  {
    const { ctx, page, errors } = await signIn(browser, "admin@demo.test");
    check("admin overview reads the live catalog", await sees(page, "122"));
    check("admin reports pgvector status", await sees(page, "pgvector active"));
    await page.screenshot({ path: "/tmp/s-admin.png" });
    check("no runtime errors (admin)", errors.length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  await browser.close();
  console.log(fail ? `\n${fail} failed` : "\nall passed");
  process.exit(fail ? 1 : 0);
})();
