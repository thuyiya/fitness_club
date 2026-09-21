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

  check("home shows Find your coach", await sees(p, "Find your coach"));
  await p.screenshot({ path: "/tmp/fc-home.png" });

  await p.goto("http://localhost:8082/member/find-coach", { waitUntil: "networkidle" });
  await p.waitForTimeout(3500);
  check("two ways to search", (await sees(p, "By gym")) && (await sees(p, "By name")));
  check("gyms listed with coach counts", await sees(p, "Riverside Strength"));
  await p.screenshot({ path: "/tmp/fc-gyms.png" });

  await p.getByText("By name", { exact: true }).first().click();
  await p.waitForTimeout(3000);
  check("coaches listed", await sees(p, "Jordan Blake"));
  check("headline shown", await sees(p, "busy professionals"));
  check("offer flagged on the card", await sees(p, "Offer"));
  await p.screenshot({ path: "/tmp/fc-coaches.png" });

  await p.getByText("Jordan Blake", { exact: true }).first().click();
  await p.waitForTimeout(4000);
  check("profile opens", await sees(p, "Currently offering"));
  check("promotion shown", await sees(p, "First month half price"));
  check("qualifications shown", await sees(p, "Level 3 PT"));
  check("specialties shown", await sees(p, "Return from injury"));
  check("where they coach", await sees(p, "Where they coach"));
  check("message before joining", await sees(p, "Message before joining"));
  await p.screenshot({ path: "/tmp/fc-profile.png" });

  console.log(errs.length ? `\n  errors: ${errs.slice(0, 3).join(" | ")}` : "\n  no runtime errors");
  await b.close();
  console.log(fail ? `\n${fail} failed` : "\nall passed");
})();
