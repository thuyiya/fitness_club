const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 420, height: 900 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("http://localhost:8082", { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await p.getByPlaceholder("Email").fill("admin@demo.test");
  await p.getByPlaceholder("Password").fill("demo-password-123");
  await p.getByText("Sign in", { exact: true }).last().click();
  await p.waitForTimeout(8000);

  // Read the pending gym id from inside the page, using its own stored token.
  const id = await p.evaluate(async () => {
    const t = localStorage.getItem("wellness.accessToken");
    // Metro serves the app on 8082; the API lives on 3001.
    const res = await fetch("http://192.168.1.172:3001/v1/admin/gyms?status=pending", { headers: { authorization: "Bearer " + t } });
    const j = await res.json();
    return j.items?.[0]?.id ?? null;
  });
  console.log("pending gym id:", id);

  if (id) {
    await p.goto(`http://localhost:8082/admin/gym/${id}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(5500);
    console.log("url:", new URL(p.url()).pathname);
    const vis = async (n) => p.locator(`text=${n}`).locator("visible=true").first().isVisible({ timeout: 6000 }).catch(() => false);
    for (const [label, needle] of [
      ["contact block", "CONTACT"], ["owner section", "OWNER"], ["instructors", "INSTRUCTORS"],
      ["members list", "MEMBERS"], ["complaints", "COMPLAINTS"], ["approve button", "Approve gym"],
      ["seeded report", "Misleading info"], ["map or placeholder", "OpenStreetMap"],
    ]) console.log(`  ${label.padEnd(20)} ${await vis(needle)}`);
    const api = await p.evaluate(async () => {
      const t = localStorage.getItem("wellness.accessToken");
      const id = location.pathname.split("/").pop();
      const r = await fetch(`http://192.168.1.172:3001/v1/admin/gyms/${id}`, { headers: { authorization: "Bearer " + t } });
      return { status: r.status, body: (await r.text()).slice(0, 220) };
    });
    console.log("API for this id ->", api.status, api.body);
    await p.screenshot({ path: "/tmp/a-detail.png" });
  }
  console.log("errors:", errs.length ? errs.slice(0, 2).join(" | ") : "none");
  await b.close();
})();
