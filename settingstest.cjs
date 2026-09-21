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

  await p.getByText("Settings", { exact: true }).last().click();
  await p.waitForTimeout(3500);
  check("PREFERENCES group", await sees(p, "PREFERENCES"));
  check("rows match the design", (await sees(p, "Notifications")) && (await sees(p, "Health connections")) && (await sees(p, "Units")));
  check("appearance kept as a row", await sees(p, "Appearance"));
  check("SUPPORT group with About", (await sees(p, "SUPPORT")) && (await sees(p, "About")));
  check("inline weight box removed", !(await sees(p, "LOG TODAY'S WEIGHT")));
  check("inline targets block removed", !(await sees(p, "DAILY TARGETS")));
  await p.screenshot({ path: "/tmp/ms-settings.png" });

  // Navigate by URL: React Native Web keeps every tab screen mounted, so a
  // back-then-click sequence can land on an element from a screen underneath.
  for (const [route, expect, shot] of [
    ["/member/appearance", "Applies to this device only", "ms-appearance"],
    ["/member/units", "Preview", "ms-units"],
    ["/member/notification-settings", "Session reminders", "ms-notif"],
    ["/member/health", "WOULD READ", "ms-health"],
    ["/legal/about", "Where the numbers come from", "ms-about"],
    ["/member/profile", "BIO", "ms-profile"],
  ]) {
    await p.goto(`http://localhost:8082${route}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(3200);
    check(`${route} renders`, await sees(p, expect));
    await p.screenshot({ path: `/tmp/${shot}.png` });
  }
  check("profile keeps weight logging", await sees(p, "Current weight"));

  console.log(errs.length ? `\n  errors: ${errs.slice(0, 3).join(" | ")}` : "\n  no runtime errors");
  await b.close();
  console.log(fail ? `\n${fail} failed` : "\nall passed");
})();
