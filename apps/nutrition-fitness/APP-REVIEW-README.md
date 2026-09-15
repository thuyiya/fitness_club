# App Review — Guideline 2.1 "Information Needed" response kit

Rejection received for **Nutrition + Fitness** v1.0.0 (`com.glitchfy.nutritionfitness`), the first
submission from this developer account. Guideline 2.1 – Information Needed is **not a content
rejection**: App Review is asking a new account to document what the app is and to prove it works on
a real device. Nothing in the binary has to change to answer it.

This file contains: what to do, in order, and the exact text to paste.

---

## 1. What to do, in order

1. **Check the screen recording** against the checklist in §2 before uploading. A recording that
   doesn't start at app launch, or that was made in a simulator, gets the same rejection back.
2. **App Store Connect → your app → App Review Information → Notes** — paste the *short* block from
   §4. This is the version that stays attached to every future submission.
3. **Sign-In Required** — leave the toggle **OFF**. The app has no accounts, so no demo credentials
   exist. Say so explicitly in the notes (done in the §4 text) rather than leaving it blank.
4. **Contact info** — make sure first/last name, phone and email are filled in; a new account with a
   blank contact row invites another round trip.
5. **Reply in the Resolution Center** (the message thread on the rejected submission) with the *full*
   answer in §3, and attach the recording there. Apple's message box accepts attachments; if the
   file is over the limit, upload it somewhere publicly reachable **without a login** (unlisted
   YouTube, Drive link set to "anyone with the link") and paste the URL. A link that asks the
   reviewer to sign in counts as no recording.
6. **Resubmit.** If the build itself is unchanged, you can reply on the existing submission — a new
   build is only needed if you change code (see §6 for optional improvements; none are required to
   answer this rejection).

---

## 2. Screen recording checklist

Requirements Apple stated: **physical device, latest iOS, starts with launching the app, shows the
typical user flow.**

Confirm your recording covers:

- [ ] Recorded on an iPhone (not the simulator), current iOS release.
- [ ] Starts from the Home screen / app icon tap — the launch itself must be on camera.
- [ ] Onboarding: welcome → profile → goal selection.
- [ ] Home: today's movement, calorie/food target, TDEE card.
- [ ] Center **+** menu: Workouts, Meal log, Exercise plan, Meal plan, Change goals, Progress photo.
- [ ] Exercise plan → generate a week → open a strength day → show diagrams, sets/reps, completion.
- [ ] Meal plan → generated menu → recipe detail → groceries list.
- [ ] Meal log / Progress photo → pick a photo → add a note → save → show it listed → **delete it**
      (this is your "data deletion" demonstration in an app with no accounts).
- [ ] Apple Health: the permission sheet, sharing categories, populated charts, and Disconnect.
- [ ] Settings: theme, units, reminders, **Reset health profile**, and the Coach model section
      showing Download / Delete model.
- [ ] Coach: send one message and show a reply (if the model was already downloaded on the device —
      otherwise show the download screen and state the size in the notes).

Things Apple asked about that **do not apply** — say so rather than ignoring them:
account registration/login/deletion (no accounts), user-generated content shared with other users
(the journal is private and local, so no reporting/blocking is required), paid content (the app is
free with no in-app purchases).

---

## 3. Reply — paste into the Resolution Center message

Apple's reply box caps at **4000 characters**. This is 3932 (3972 worst case if the field counts
CRLF line endings). Section 2 answers Apple's wording directly — purpose, problem it solves,
value it provides, target audience — as four labelled lines, so a reviewer ticking off the
request can find each one. If you edit it, re-check the length.

```text
Answers below; also added to App Review Information > Notes.

1. SCREEN RECORDING
Attached, captured on a physical iPhone running the latest iOS. It begins with launching the app and walks through the section 3 flow, including photo save/delete and Apple Health connect/disconnect.
- Account registration/login/deletion: the app has NO accounts and no sign-in, so there is no account to delete. Equivalent controls are shown: delete journal entries, Settings > Reset health profile, Settings > Coach > Delete model, or delete the app.
- User-generated content: notes and journal photos stay on the device. No feed, sharing or messaging, so reporting and blocking do not apply.
- Paid content: the app is free. No in-app purchases or subscriptions.

2. PURPOSE, PROBLEM, VALUE, AUDIENCE
Purpose: a private, offline-first planner for everyday nutrition and exercise.
Problem it solves: mainstream fitness apps need an account, a connection and a subscription, split planning, programming and progress across separate products, and assume equipment and experience beginners lack.
Value it provides: from a short profile it estimates daily energy needs and calorie/protein targets, generates a weekly bodyweight routine sized to available time (15/25/40 min) with illustrated guides, sets, reps and recovery days, plus a daily menu and grocery list. Offline, no account, all data on the device.
Target audience: general adults, especially beginners and people returning to exercise after a break. Not for children, supervised athletes or medical patients. In-app text states it gives general wellness information, not medical advice, and that figures are estimates.

3. SETUP AND ACCESS
No credentials, demo account or sample files. Sign-in required: No.
1) Complete the welcome flow with any test adult profile and goal.
2) The centre + button opens Workouts, Meal log, Exercise plan, Meal plan, Change goals and Progress photo.
3) Exercise plan > Generate/change plan > Generate my week builds a routine offline. Open a strength day for diagrams, sets, reps and completion. Recovery days are intentional.
4) Meal plan generates a daily menu; tap a meal for the recipe, Groceries for the list.
5) Meal log / Progress photo: pick a photo, add a note, save, delete. Calories and protein are typed manually; there is no image recognition or calorie estimation.
6) Apple Health (Settings or Progress): READ-ONLY access to steps, active energy, exercise minutes, distance, workouts and body mass. Nothing is written to HealthKit. Charts fill only from data already on the review device; gaps show as dashes. Denying access does not block the app.
7) The AI coach is OPTIONAL and runs fully on device. It needs a one-time ~940 MB Wi-Fi download (Settings > Coach > Download coach). All other features work without it, so the app is reviewable without waiting.

4. EXTERNAL SERVICES
We have no backend. No user data, photo, note or AI prompt is transmitted anywhere.
- Apple HealthKit: read-only, on device, with permission.
- Hugging Face CDN: one-time download of the optional model file only.
- llama.rn / llama.cpp: on-device inference, Qwen2.5-1.5B-Instruct, Apache 2.0.
- Expo EAS Updates: app updates.
- Apple local notifications: optional reminders, no push server.
No auth provider, payment processor, analytics, advertising or tracking.

5. REGIONS
Identical in every region. No geo-gating, regional content or pricing, no location services. English (U.S.) only; metric/imperial is a user setting, not a regional one.

6. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Neither applies. General consumer fitness and nutrition: no diagnosis, treatment, prescription or telehealth; not a medical device. Recipes, exercise programming and illustrations are our own original content; no licensed imagery, trademarks or third-party nutrition data.

Privacy and support: https://nutrition-fitness-glitchfy.web.app/privacy.html and /support.html
```

## 4. Short version — paste into App Review Information → Notes

Keep this permanently in the Notes field; it answers most first-submission questions up front.

```text
NO ACCOUNT / NO LOGIN / NO IN-APP PURCHASE. Sign-in required: No. Demo credentials: not applicable.

WHAT IT IS
Nutrition + Fitness is an offline-first nutrition and movement planner for general adult consumers.
From a short profile it estimates daily energy needs, generates a weekly bodyweight exercise routine
(15/25/40-minute sessions, illustrated guides, sets/reps, recovery days) and a daily meal plan with a
grocery list, keeps a private photo journal, and can display Apple Health progress. Everything is
stored on the device. General wellness information only — not medical advice; figures are estimates.

HOW TO REVIEW
1. Complete the welcome flow with any test adult profile and pick a goal.
2. Home shows today's movement, food and energy targets.
3. The centre + button opens Workouts, Meal log, Exercise plan, Meal plan, Change goals, Progress
   photo.
4. Exercise plan Generate/change plan Generate my week builds a routine offline. Open a strength
   day for diagrams, sets, reps and completion. Recovery days are intentional.
5. Meal plan generates a daily menu; tap a meal for the recipe, Groceries for the shopping list.
6. Meal log / Progress photo: pick a photo, add a note, save, and delete the entry. Calories and
   protein are typed manually — there is no image recognition or automatic calorie estimation.
7. Apple Health (Settings or Progress): READ-ONLY access to steps, active energy, exercise minutes,
   distance, workouts and body mass. Nothing is written to HealthKit. Charts fill only from data
   already on the review device; missing data shows as dashes. Denying access does not block the app.
8. AI coach is OPTIONAL and runs fully on device (Qwen2.5-1.5B via llama.rn). It needs a one-time
   ~940 MB model download over Wi-Fi (Settings Coach Download coach). All planning, logging,
   journal and Health features work without it.

DATA DELETION (no accounts exist): delete individual journal entries, Settings Reset health
profile, Settings Coach Delete model, or delete the app.

EXTERNAL SERVICES: Apple HealthKit (read-only, on device); Hugging Face CDN (one-time model file
download only); llama.rn/llama.cpp (on-device inference, Qwen2.5-1.5B-Instruct, Apache 2.0); Expo
EAS Updates (app updates); Apple local notifications (no push server). No backend of our own, no
remote AI service, no auth provider, no payment processor, no analytics, ads or tracking. No user
health data, photo, note or AI prompt is transmitted anywhere.

USER-GENERATED CONTENT: private to the device. No feed, sharing or messaging between users, so
reporting/blocking mechanisms are not applicable.

REGIONS: identical behaviour in every region. No geo-gating, no regional content or pricing, no
location services. English (U.S.) only; metric/imperial is a user preference, not a regional switch.

REGULATED INDUSTRY / THIRD-PARTY MATERIAL: none. No medical, diagnostic or telehealth functionality
and not a medical device. Recipes, exercise programming and illustrations are our own original
content; no licensed third-party imagery, trademarks or nutrition database. The optional model is
Apache 2.0 licensed.

Privacy: https://nutrition-fitness-glitchfy.web.app/privacy.html
Support: https://nutrition-fitness-glitchfy.web.app/support.html
Contact: support@glitchfy.com
```

---

## 5. Facts this reply is based on

Verified in this repo on 15 September 2026, so the claims above are accurate for v1.0.0:

| Claim | Where it is verified |
|---|---|
| No accounts, no auth | No auth/login/session code in `src/` or `app/`; no auth dependency in `package.json` |
| No IAP / subscriptions | No StoreKit, RevenueCat or payment dependency in `package.json` |
| Only two external hosts referenced in app code | `huggingface.co` (`src/lib/llm/config.ts`) and the Expo Updates URL in `app.json` |
| On-device inference | `llama.rn` + `qwen2.5-1.5b-instruct-q4_k_m.gguf`, `src/lib/llm/config.ts` |
| HealthKit read-only | `NSHealthUpdateUsageDescription` in `app.json` states no writes; local `fitness-health` module requests read access |
| Local notifications only | `src/lib/notify.ts` uses `scheduleNotificationAsync`; no `getExpoPushToken` call |
| Local storage only | MMKV + app document storage; see `README.md` and `release/app-store-kit/PRIVACY-ANSWERS.md` |
| Recipes are in-house | `src/data/meals.ts` — curated library authored for this app |
| Exercise art is in-house | `exercise-db/sprites/` generated for this app, log in `generation-log.jsonl` |

---

## 6. Optional hardening (not required to answer this rejection)

These do not block the reply, but each one removes a plausible reason for a follow-up rejection.
They all need a new build, so only do them if you are rebuilding anyway.

1. **Add a privacy policy link in Settings.** `app/(tabs)/settings.tsx` "Data & Privacy" currently
   only offers "Reset health profile". Apps with HealthKit access are expected to make the policy
   easy to find; the App Store Connect URL field is the minimum, an in-app link is the safe version.
2. **Rename "Reset health profile" to something that reads as data deletion** (for example "Delete
   my data"), and make clear in the confirmation what it clears. Reviewers look for a deletion
   control; the current wording reads as a settings reset.
3. **Make the AI model download visibly skippable.** If the first-launch download starts on its own,
   a reviewer on a slow network may think the app is stuck. A clear "Skip for now / continue without
   the coach" affordance removes that risk.
4. **Confirm the App Privacy answers** in App Store Connect match §4 above before resubmitting — see
   `release/app-store-kit/PRIVACY-ANSWERS.md`. In particular do not declare tracking, and do not
   mark Health data as collected (it never leaves the device).

## 7. Related files

- `release/app-store-kit/COPY-PASTE.md` — listing field values
- `release/app-store-kit/SUBMISSION-GUIDE.md` — submission checklist
- `release/app-store-kit/PRIVACY-ANSWERS.md` — App Privacy worksheet
- `release/ios-release.md` — credentials, build/submit commands (`npm run build:ios`, `npm run submit:ios`)
