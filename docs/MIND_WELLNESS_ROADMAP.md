# Solace — Mind Wellness & Personalization Roadmap

This is the plan for the work that follows the first build wave. It reflects the three
decisions made at kickoff:

- **AI chat:** on-device only (llama.rn). Mood + Buddhist-technique context feeds the
  existing coach's prompt — no cloud OpenAI, no API key handling.
- **Integrations (Gmail / Calendar / Gallery):** *scaffold now, wire later.* Add Settings
  toggles, permission requests, and stub service modules with clean interfaces. Real OAuth
  / data wiring is a deliberate later pass, not this one.
- **Sequencing:** the 3 self-contained workstreams (Buddhist knowledge base, gamified mood
  check-in, sleep tracking) are built first. Everything below builds on them.

---

## Wave 1 — SHIPPED IN THIS PASS (built by agents, wired by orchestrator)

| Workstream | Core artifacts | Notes |
|---|---|---|
| Buddhist mind-healing KB | `src/data/buddhistTechniques.ts`, `src/lib/mindGuidance.ts` | Feeds coach prompt via `buildMindGuidancePrompt()` |
| Gamified mood check-in | `src/store/moodStore.ts`, `app/checkin.tsx`, `MoodSlider`, `EmojiMoodPicker` | Emoji + sliders; the deep-link target for check-in notifications |
| Sleep tracking | `app/sleep.tsx`, extended `logStore`/`DailyLog`, sleep history chart | Replaces the bare `sleepHours` number with a real logging + history experience |

---

## Wave 2 — Notification engine ("How are you feeling today?" / "Take a breath")

**Goal:** proactively invite the user to check in, and route each tap to the right screen so
we can gather emotional-state data over time.

**New dependency:** `expo-notifications` (local notifications; no server/push infra needed to
start). Requires config plugin entry in `app.json` and iOS permission prompt.

**Build:**
- `src/lib/notifications/scheduler.ts` — request permissions, schedule/cancel recurring local
  notifications, stable notification identifiers per category.
- Notification categories, each deep-linking via `expo-router`:
  - **"How are you feeling today?"** → `/checkin` (mood store).
  - **"Take a breath"** → `/breathe` (existing player).
  - Reuse existing toggles (meals/walk/workout/water/weigh-in/motivation) — migrate them from
    cosmetic booleans to real scheduled notifications.
- `src/lib/notifications/deepLink.ts` — map notification `data.route` → router navigation on
  cold start and warm tap.
- **Settings wiring:** the existing `notifications` toggles in `settingsStore` gain two new
  entries (`moodCheckin`, `breathePrompt`) plus a time-of-day picker per reminder.
- **Cadence intelligence (light):** default to 1–2 mood prompts/day at sensible times;
  respect quiet hours. Full "learn free time from calendar" cadence is Wave 4.

**Acceptance:** toggling a reminder in Settings schedules a real OS notification; tapping it
opens the correct screen from both foreground and cold start.

---

## Wave 3 — Mood-aware on-device chat

**Goal:** when the user is low, the coach responds with warmth and offers the right practice —
using the mood history + Buddhist KB, all on-device.

**Build:**
- Extend the coach prompt assembly (see Agent A's integration manifest) so every coach turn
  can include: (a) latest mood entry + recent trend from `moodStore`, (b)
  `buildMindGuidancePrompt(states)` for the user's current states.
- `src/lib/mood/inferStates.ts` — map a `MoodEntry` (valence/energy/primary) → the
  `MoodState[]` controlled vocabulary the KB understands (e.g. low valence + low energy →
  `['sadness','low-energy']`).
- **"Make me feel better" flow:** when latest mood is sad/hurting, the coach proactively
  offers: a recommended technique (breathe/RAIN/metta), and — Wave 4 — a happy photo or memory.
- Keep it strictly on-device (llama.rn). No network.

**Acceptance:** after logging a sad check-in, opening the coach yields a gentle, technique-
grounded response that references how the user said they feel.

---

## Wave 4 — Personal-context integrations (SCAFFOLD in this roadmap, wire later)

Each integration ships in two stages. **Stage A (now-ish): scaffold** — a Settings row, a
permission request, and a stub service exposing a typed interface returning mock/empty data.
**Stage B (later): wire** — real data behind the same interface. UI/consumers depend only on
the interface, so Stage B is a drop-in.

- `src/lib/integrations/` with one module per source, all implementing a common shape:
  `{ isConnected(): boolean; requestAccess(): Promise<PermissionResult>; ... }`.

### 4a. Gallery → "find good photos to lift the mood"
- **Native:** `expo-media-library` (on-device, no OAuth).
- Stub `galleryService.ts`: `requestAccess()`, `getUpliftingPhotos(n)` (Stage B: recents /
  favorites / album heuristics; optional on-device smile/scene heuristic later).
- Consumer: the sad-mood flow shows 1–3 photos and asks a gentle question about them.

### 4b. Calendar → "understand free time"
- **Native:** `expo-calendar` (on-device, no OAuth).
- Stub `calendarService.ts`: `requestAccess()`, `getFreeWindows(date)` → used by the Wave 2
  scheduler to place check-ins in genuinely free moments.

### 4c. Gmail → "understand working pattern"
- **Biggest lift:** requires Google OAuth (Google Cloud project + consent screen + restricted
  scopes) — flagged as the reason Gmail stays scaffold-only for now.
- Stub `gmailService.ts`: `connect()` (OAuth placeholder), `getActivitySummary()` → coarse
  busy/quiet signal only; **never** store or display message content. Privacy-first.

### Settings surface
New "Personal context" section in `app/(tabs)/settings.tsx`:
Gallery · Calendar · Gmail rows, each showing connection state + a connect/permission action,
with copy explaining exactly what is read and that data stays on-device.

---

## Cross-cutting: privacy & data model

- All mood/sleep/context data persists on-device (MMKV via existing `zustandStorage`). No
  cloud sync in these waves.
- The user can clear mood/sleep history from Settings.
- Every integration states, in plain language, what it reads and why, before requesting access.

## Suggested order

1. Wave 2 notifications (unlocks the "how are you feeling" loop end-to-end).
2. Wave 3 mood-aware chat (turns the gathered data into felt value).
3. Wave 4 scaffolds (Calendar + Gallery first — no OAuth; Gmail last).
