const { chromium } = require("playwright-core");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sees = (p, n) => p.locator(`text=${n}`).locator("visible=true").first().isVisible({ timeout: 9000 }).catch(() => false);

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

  await p.getByText("Settings", { exact: true }).last().click();
  await p.waitForTimeout(3000);
  check("MANAGE group present", await sees(p, "MANAGE"));
  check("rows match the design", (await sees(p, "Gyms")) && (await sees(p, "Members")) && (await sees(p, "Plans & templates")) && (await sees(p, "Teams")));
  check("PREFERENCES group present", await sees(p, "PREFERENCES"));
  check("privacy / terms / help listed", (await sees(p, "Privacy")) && (await sees(p, "Terms and conditions")) && (await sees(p, "Help and support")));
  check("notifications row removed", !(await sees(p, "Notifications")));
  check("backend build notes removed", !(await sees(p, "API-complete")));
  await p.screenshot({ path: "/tmp/s-settings.png" });

  await p.getByText("Gyms", { exact: true }).first().click();
  await p.waitForTimeout(3000);
  check("gyms screen lists the coach's gym", await sees(p, "Riverside Strength"));
  check("join-an-existing-gym action present", await sees(p, "Join an existing gym"));
  await p.screenshot({ path: "/tmp/s-gyms.png" });

  await p.getByText("Join an existing gym", { exact: true }).first().click();
  await p.waitForTimeout(2500);
  check("browse sheet shows admin-created gyms", await sees(p, "Head Office Gym"));
  await p.screenshot({ path: "/tmp/s-browse.png" });
  await p.keyboard.press("Escape");
  await p.waitForTimeout(800);

  await p.goto("http://localhost:8081/legal/privacy", { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  check("privacy page renders", await sees(p, "Who can see it"));
  await p.goto("http://localhost:8081/legal/terms", { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  check("terms page renders", await sees(p, "This is not medical advice"));
  await p.goto("http://localhost:8081/legal/help", { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  check("help page renders", await sees(p, "My gym is waiting for approval"));

  console.log(errs.length ? `\n  errors: ${errs.slice(0, 3).join(" | ")}` : "\n  no runtime errors");
  await b.close();
  console.log(fail ? `\n${fail} failed` : "\nall passed");
})();
