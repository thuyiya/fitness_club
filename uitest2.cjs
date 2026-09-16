const { chromium } = require("playwright-core");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sees = (page, needle) =>
  page.locator(`text=${needle}`).locator("visible=true").first().isVisible({ timeout: 9000 }).catch(() => false);

async function goTo(page, tab, expect) {
  await page.getByText(tab, { exact: true }).last().click();
  await page.waitForFunction(
    (n) => [...document.querySelectorAll("*")].some((el) => el.textContent?.includes(n) && el.getBoundingClientRect().width > 0),
    expect, { timeout: 20000 },
  ).catch(() => {});
  await page.waitForTimeout(900);
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
  await page.waitForTimeout(6000);
  return { ctx, page, errors };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  let fail = 0;
  const check = (l, c, d = "") => { if (c) console.log(`  ok    ${l}`); else { fail++; console.log(`  FAIL  ${l}${d ? " -- " + d : ""}`); } };

  // --- member ---------------------------------------------------------------
  {
    const { ctx, page, errors } = await signIn(browser, "member@demo.test");

    // Bottom sheet from the centre +
    await page.locator("text=Home").last().click();
    await page.waitForTimeout(1200);
    const plusBtn = page.locator("div").filter({ hasText: /^$/ }).nth(0);
    await page.evaluate(() => {
      const els = [...document.querySelectorAll("*")];
      const plus = els.find((e) => e.textContent === "" && e.getBoundingClientRect().width === 56);
      plus?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForTimeout(1500);
    check("quick-log sheet opens from the + button", await sees(page, "Quick log"));
    check("sheet offers exercise logging", await sees(page, "Sets, reps and load"));
    await page.screenshot({ path: "/tmp/n-sheet.png" });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);

    await goTo(page, "Training", "From your coach");
    check("training shows coach-prescribed work", await sees(page, "From your coach"));
    check("prescribed exercises are listed", await sees(page, "Barbell bench press"));
    check("logged section is separate", await sees(page, "Logged today"));
    await page.screenshot({ path: "/tmp/n-training.png" });

    await goTo(page, "Progress", "Goals");
    check("goals offer a create button", await sees(page, "New goal"));
    check("dot graph labels logged days", await sees(page, "logged days met"));
    await page.screenshot({ path: "/tmp/n-progress.png" });

    check("no runtime errors (member)", errors.length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  // --- coach ----------------------------------------------------------------
  {
    const { ctx, page, errors } = await signIn(browser, "coach@demo.test");
    check("coach home lists the roster", await sees(page, "Alex Rivera"));

    await page.getByText("Alex Rivera", { exact: false }).first().click();
    await page.waitForTimeout(3000);
    check("tapping a member opens their detail", await sees(page, "Assigned plans"));
    check("member detail shows today's logs", await sees(page, "Today"));
    check("member detail shows goal adherence", await sees(page, "days met this week"));
    await page.screenshot({ path: "/tmp/n-memberdetail.png" });

    check("no runtime errors (coach)", errors.length === 0, errors.slice(0, 3).join(" | "));
    await ctx.close();
  }

  await browser.close();
  console.log(fail ? `\n${fail} failed` : "\nall passed");
  process.exit(fail ? 1 : 0);
})();
