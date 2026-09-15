#!/usr/bin/env node
/**
 * One command to bring the whole stack up for a simulator or emulator run.
 *
 *   node scripts/dev.mjs ios       # boot the iOS simulator
 *   node scripts/dev.mjs android   # boot the Android emulator
 *   node scripts/dev.mjs web       # browser
 *   node scripts/dev.mjs           # start Metro, choose a target yourself
 *
 * Checks prerequisites before starting anything, because a stack that comes up
 * half-working wastes far more time than one that refuses with a reason.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "apps", "wellness");
const API = join(ROOT, "apps", "api");
const target = process.argv[2];

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const warn = (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`);
const die = (m, hint) => {
  console.log(`  \x1b[31m✗\x1b[0m ${m}`);
  if (hint) console.log(`\n    ${hint}\n`);
  process.exit(1);
};

/** The address a phone or emulator can actually reach this machine on. */
function lanAddress() {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) return a.address;
    }
  }
  return null;
}

const reachable = async (url) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
};


/**
 * Expo Go is version-locked to an SDK. A machine with a current Expo Go
 * installed cannot open an SDK 52 project at all, and the CLI's offer to fix
 * it needs an interactive answer --- which breaks any scripted run. Install
 * the matching client ourselves instead.
 */
async function ensureExpoGo(sdk) {
  const listed = spawnSync("xcrun", ["simctl", "listapps", "booted"], { encoding: "utf8" }).stdout ?? "";
  const installed = /host\.exp\.Exponent/.test(listed);
  const wanted = listed.match(/Expo-Go-([\d.]+)\.tar\.app/)?.[1];

  const versions = await fetch("https://api.expo.dev/v2/versions/latest")
    .then((r) => r.json())
    .catch(() => null);
  const expected = versions?.data?.sdkVersions?.[sdk]?.iosClientVersion;
  const url = versions?.data?.sdkVersions?.[sdk]?.iosClientUrl;
  if (!expected || !url) {
    warn("Could not check the Expo Go version (offline?) --- continuing");
    return;
  }
  if (installed && (wanted === expected || !wanted)) {
    ok(`Expo Go matches SDK ${sdk}`);
    return;
  }

  console.log(`  … installing Expo Go ${expected} for SDK ${sdk} (the simulator has ${wanted ?? "a different build"})`);
  const tgz = "/tmp/wellness-expo-go.tar.gz";
  const dir = "/tmp/wellness-expo-go";
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) die(`Could not download Expo Go ${expected}`, `Download it yourself from ${url}`);
  writeFileSync(tgz, Buffer.from(await res.arrayBuffer()));

  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "Expo Go.app"), { recursive: true });
  spawnSync("tar", ["-xzf", tgz, "-C", join(dir, "Expo Go.app")]);
  spawnSync("xcrun", ["simctl", "uninstall", "booted", "host.exp.Exponent"], { stdio: "ignore" });
  const install = spawnSync("xcrun", ["simctl", "install", "booted", join(dir, "Expo Go.app")], { encoding: "utf8" });
  if (install.status !== 0) die("Installing Expo Go failed", install.stderr);
  ok(`Expo Go ${expected} installed`);
}

console.log("\nWellness 2.0 — checking prerequisites\n");

// --- database ---------------------------------------------------------------
const psql = spawnSync("docker", ["exec", "wellness-postgres-1", "pg_isready", "-U", "wellness"], { encoding: "utf8" });
if (psql.status !== 0) {
  die("Postgres is not running", "Start it with:  pnpm infra:up");
}
ok("Postgres is up");

const counts = spawnSync("docker", [
  "exec", "wellness-postgres-1", "psql", "-U", "wellness", "-d", "wellness", "-tAc",
  "select (select count(*) from foods)||'/'||(select count(*) from exercises)||'/'||(select count(*) from users)",
], { encoding: "utf8" });
const [foods, exercises, users] = (counts.stdout ?? "").trim().split("/").map(Number);
if (!foods) die("The database is empty", "Seed it with:  pnpm db:seed && pnpm db:embed");
ok(`Catalog seeded (${foods} foods, ${exercises} exercises)`);
if (!users) warn("No users yet — run `pnpm demo:users` to create the demo logins");

// --- api --------------------------------------------------------------------
let api = null;
if (await reachable("http://localhost:3001/health")) {
  ok("API already running on :3001");
} else {
  console.log("  … starting the API");
  api = spawn("pnpm", ["--filter", "@wellness/api", "dev"], { cwd: ROOT, stdio: "inherit", env: process.env });
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await reachable("http://localhost:3001/health")) break;
    if (i === 29) die("The API did not come up", "Check apps/api/.env.local exists and DATABASE_URL is correct.");
  }
  ok("API listening on :3001");
}

// --- target-specific checks -------------------------------------------------
if (target === "ios") {
  if (spawnSync("xcrun", ["simctl", "help"], { stdio: "ignore" }).status !== 0) {
    die("Xcode command line tools are missing", "Install Xcode, then:  xcode-select --install");
  }
  // A booted device is required before Expo Go can be installed onto it.
  const booted = spawnSync("xcrun", ["simctl", "list", "devices", "booted"], { encoding: "utf8" }).stdout ?? "";
  if (!/\(Booted\)/.test(booted)) {
    ok("Booting the iOS simulator");
    spawnSync("open", ["-a", "Simulator"]);
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const now = spawnSync("xcrun", ["simctl", "list", "devices", "booted"], { encoding: "utf8" }).stdout ?? "";
      if (/\(Booted\)/.test(now)) break;
    }
  }
  ok("iOS simulator ready");

  // node-linker=hoisted puts expo at the workspace root, not in the app.
  const expoPkg = [join(APP, "node_modules/expo/package.json"), join(ROOT, "node_modules/expo/package.json")]
    .find((p) => existsSync(p));
  if (!expoPkg) die("Could not find the expo package", "Run:  pnpm install");
  const sdk = JSON.parse(readFileSync(expoPkg, "utf8")).version.split(".")[0] + ".0.0";
  await ensureExpoGo(sdk);
}

if (target === "android") {
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? join(process.env.HOME ?? "", "Library/Android/sdk");
  const emulator = join(sdk, "emulator", "emulator");
  if (!existsSync(emulator)) {
    die("No Android SDK found", "Install Android Studio, then set ANDROID_HOME to its SDK path.");
  }
  const avds = spawnSync(emulator, ["-list-avds"], { encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean);
  if (avds.length === 0) die("No Android virtual devices", "Create one in Android Studio > Device Manager.");

  const running = spawnSync(join(sdk, "platform-tools", "adb"), ["devices"], { encoding: "utf8" }).stdout ?? "";
  if (/emulator-\d+\s+device/.test(running)) {
    ok("Android emulator already running");
  } else {
    ok(`Booting Android emulator (${avds[0]})`);
    spawn(emulator, ["-avd", avds[0]], { detached: true, stdio: "ignore" }).unref();
    // The emulator takes a while; Expo will wait for it, but say so.
    console.log("    first boot can take a minute or two");
  }
  console.log("    the app reaches the API at 10.0.2.2:3001 — handled automatically");
}

const lan = lanAddress();
if (lan) console.log(`\n  Physical device? Make sure it is on the same network as ${lan}\n`);

// --- metro ------------------------------------------------------------------
const args = ["start"];
if (target === "ios") args.push("--ios");
else if (target === "android") args.push("--android");
else if (target === "web") args.push("--web");

console.log("Starting Metro…\n");
const expo = spawn(join(ROOT, "node_modules", ".bin", "expo"), args, { cwd: APP, stdio: "inherit", env: process.env });

const stop = () => {
  expo.kill("SIGINT");
  api?.kill("SIGINT");
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
expo.on("exit", (code) => {
  api?.kill("SIGINT");
  process.exit(code ?? 0);
});
