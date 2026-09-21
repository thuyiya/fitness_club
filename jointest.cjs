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

  // --- member sends the request ---------------------------------------------
  const mc = await b.newContext({ viewport: { width: 420, height: 900 } });
  const m = await mc.newPage();
  const merrs = []; m.on("pageerror", (e) => merrs.push(e.message));
  await login(m, "fresh@demo.test");
  check("home prompts to find a coach", await sees(m, "Find your coach"));

  await m.goto("http://localhost:8082/member/find-coach", { waitUntil: "networkidle" });
  await m.waitForTimeout(3000);
  await m.getByText("By name", { exact: true }).first().click();
  await m.waitForTimeout(2500);
  await m.getByText("Jordan Blake", { exact: true }).first().click();
  await m.waitForTimeout(4000);
  check("coach profile opens", await sees(m, "Where they coach"));
  check("request button offered", await sees(m, "Request to join"));

  await m.getByText("Request to join", { exact: true }).first().click();
  await m.waitForTimeout(3500);
  check("request sent, state shown", await sees(m, "Requested"));
  check("waiting message explains", await sees(m, "Your request is with"));
  await m.screenshot({ path: "/tmp/jr-member.png" });
  await mc.close();

  // --- coach sees and approves it -------------------------------------------
  const cc = await b.newContext({ viewport: { width: 420, height: 900 } });
  const c = await cc.newPage();
  const cerrs = []; c.on("pageerror", (e) => cerrs.push(e.message));
  await login(c, "coach@demo.test");
  await c.goto("http://localhost:8082/coach/members", { waitUntil: "networkidle" });
  await c.waitForTimeout(3500);
  check("coach sees the request", await sees(c, "Nadia Fresh"));
  check("queue names the requested coach", await sees(c, "Asked for Jordan Blake"));
  check("their message carried through", await sees(c, "coach directory"));
  await c.screenshot({ path: "/tmp/jr-coach.png" });

  await c.getByText("Approve", { exact: true }).first().click();
  await c.waitForTimeout(3500);
  check("approving moves them to the roster", await sees(c, "Your members"));
  await c.screenshot({ path: "/tmp/jr-approved.png" });
  await cc.close();

  console.log([...merrs, ...cerrs].length ? `\n  errors: ${[...merrs, ...cerrs].slice(0, 3).join(" | ")}` : "\n  no runtime errors");
  await b.close();
  console.log(fail ? `\n${fail} failed` : "\nall passed");
})();
