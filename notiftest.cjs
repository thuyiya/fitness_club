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
  await p.getByPlaceholder("Email").fill("coach@demo.test");
  await p.getByPlaceholder("Password").fill("demo-password-123");
  await p.getByText("Sign in", { exact: true }).last().click();
  await p.waitForTimeout(8000);

  // The bell on coach home should carry the unread count.
  const badge = await p.evaluate(() => {
    const els = [...document.querySelectorAll("*")].filter((e) => e.textContent?.trim() === "1" && e.getBoundingClientRect().top < 120);
    return els.length > 0;
  });
  check("bell shows the unread count", badge);

  await p.goto("http://localhost:8082/coach/notifications", { waitUntil: "networkidle" });
  await p.waitForTimeout(3500);
  check("notification listed", await sees(p, "New join request"));
  check("row says it is actionable", await sees(p, "Review request"));
  await p.screenshot({ path: "/tmp/nt-list.png" });

  await p.getByText("New join request", { exact: true }).first().click();
  await p.waitForTimeout(4000);
  check("tapping lands on the approval queue", new URL(p.url()).pathname === "/coach/members", p.url());
  check("the request is right there", await sees(p, "Nadia Fresh"));
  check("approve is available", await sees(p, "Approve"));
  await p.screenshot({ path: "/tmp/nt-queue.png" });

  // Acting on it should have cleared the badge.
  await p.goto("http://localhost:8082/coach/notifications", { waitUntil: "networkidle" });
  await p.waitForTimeout(3000);
  // "Mark all" is always rendered, just transparent when nothing is unread,
  // so ask the API rather than reading the DOM.
  const unread = await p.evaluate(async () => {
    const t = localStorage.getItem("wellness.accessToken");
    const r = await fetch("http://192.168.1.172:3001/v1/notifications", { headers: { authorization: "Bearer " + t } });
    return (await r.json()).unreadCount;
  });
  check("tapping marked it read", unread === 0, `unreadCount=${unread}`);

  await p.getByText("Approve", { exact: true }).first().click().catch(() => {});
  console.log(errs.length ? `\n  errors: ${errs.slice(0, 3).join(" | ")}` : "\n  no runtime errors");
  await b.close();
  console.log(fail ? `\n${fail} failed` : "\nall passed");
})();
