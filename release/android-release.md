# Nutrition + Fitness — Android (Google Play) release

App: Nutrition + Fitness
Package name: com.glitchfy.nutritionfitness
Expo project: @glitchfy/fitness-club (EAS project ID 54075fd3-fcf3-4fab-8af4-6aa13ab55449)

Apple Health integration (`modules/fitness-health`) is iOS-only — there is no Android implementation, so the Play Store listing and Data Safety form should not mention health-data sharing for this build.

## 1. Google Play Console account

- Create/sign in to a Google Play Console developer account: https://play.google.com/console/signup (one-time $25 registration fee, identity verification can take a few days).
- Create the app: Play Console → All apps → Create app.
  - App name: "Nutrition + Fitness"
  - Default language: English (US)
  - App or game: App
  - Free or paid: Free (or Paid, if pricing is decided)
  - Accept the Developer Program Policies + US export laws declarations.

## 2. Generate the production build (AAB)

```
npx eas build --platform android --profile production
```

- `eas.json` already has a `production` profile using `android.buildType: app-bundle` and `autoIncrement: true` (EAS manages `versionCode` remotely via `appVersionSource: remote`).
- First run generates/stores an Android keystore in EAS if one doesn't exist yet — let EAS manage it unless you already have a keystore you must reuse.
- Confirm the build finishes and download the `.aab` if you want to sanity-check it manually (not required for `eas submit`).

## 3. Service account for automated submission (`eas submit`)

`eas.json` already has a `submit.production.android` block (`track: internal`, `releaseStatus: draft`), but it needs a service account key before `eas submit` can authenticate.

1. In Play Console: Setup → API access → link/create a Google Cloud project, then create a service account.
2. In Google Cloud Console, create a JSON key for that service account and download it.
3. Back in Play Console → API access, grant the service account permissions: at minimum "Release manager" (or Admin) access under Users and permissions.
4. Save the JSON key somewhere **outside version control**, e.g. `~/secrets/nutrition-fitness-play.json`.
5. Add the path to `eas.json`:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "/absolute/path/to/nutrition-fitness-play.json",
      "track": "internal",
      "releaseStatus": "draft"
    }
  }
}
```

Do not commit the key file. Add its path/pattern to `.gitignore` if it ever lives inside the repo.

## 4. First submission must be manual

Google Play requires the **first** release of a new app to be uploaded through the Play Console UI (API/`eas submit` can't create the first release). So:

1. Build the AAB (`eas build` above) and download it from the EAS build page.
2. Play Console → your app → Release → Testing → Internal testing → Create new release.
3. Upload the `.aab`, add release notes, save and roll out to Internal testing.
4. Add at least one internal tester email (your own Google account) under the Internal testing track and open the opt-in link to install it.

After that first manual release exists, subsequent builds can go through:

```
npx eas submit --platform android --profile production
```

which uploads straight to the `internal` track as a draft (per the current `eas.json`).

## 5. Store listing content needed

Play Console → Grow → Store presence → Main store listing:

- Short description (≤80 chars).
- Full description (≤4000 chars) — can reuse/adapt the iOS release description in `release/ios-release.md`.
- App icon: 512×512 PNG (32-bit, with alpha), generated from `assets/icon.png`.
- Feature graphic: 1024×500 PNG/JPG (required, no transparency).
- Phone screenshots: at least 2, up to 8, 16:9 or 9:16, min 320px on the short side.
- Optional: tablet screenshots, promo video URL.
- Category (Health & Fitness) and tags.
- Contact details: email required; website/phone optional.
- Privacy policy URL (public, required — reuse/adapt the one used for iOS).

## 6. App content questionnaires (required before any release, including internal)

Play Console → Policy → App content:

- **Privacy policy**: public URL.
- **Data safety form**: declare what the app collects/shares. On Android this build has no HealthKit data. Likely declarations:
  - Personal info: none collected remotely (app is on-device/offline for meals/plans/photos unless you use analytics — check).
  - Photos/videos: collected, stored on-device only, not shared, tied to local journal (expo-image-picker use).
  - App activity/exercise data: on-device only unless you added analytics.
  - Confirm encryption-in-transit and account-deletion answers based on actual backend usage (this app appears to be local-only/offline-first — verify before submitting).
- **Ads**: declare "No ads" if none are integrated.
- **Content rating questionnaire**: fill out via IARC (health/fitness app, no violence/gambling — should land as "Everyone" or similar).
- **Target audience and content**: select target age group (13+ likely, given account/health-adjacent content) and answer whether the app appeals to children (No, if not designed for kids).
- **Government apps / financial features / health apps declarations**: answer "No" unless applicable — this is a personal wellness tracker, not a medical device.
- **News app / COVID-19 app**: No.

## 7. App signing & permissions review

- Confirm Play App Signing is enabled (default when EAS manages the keystore) — Release → Setup → App signing.
- Review the permissions the AAB requests (Play Console → App content → shows an auto-generated list from the manifest): expect camera, photo library, notifications; no location/health permissions on Android since HealthKit is iOS-only.

## 8. Roll out

1. Internal testing track first (fast, no review) — validate install, camera/photo journal flow, notifications, offline AI download/plan flow on a real Android device.
2. Promote to Closed testing (optional) or straight to Production once internal testing passes.
3. Production release requires Google review (usually hours to a few days for a new app, longer for policy-sensitive categories).
4. Staged rollout percentage can be set on the Production release to limit blast radius.

## What to test (Android)

- Fresh install on a real Android device/emulator (Android 13+ recommended given targetSdk requirements).
- Meal/progress photo capture and gallery picker, permission grant/deny, restart persistence.
- Exercise plan generation (15/25/40 min, gentle/steady) and daily completion logging — same flows as iOS since this is JS-only logic.
- Push notification permission prompt and a scheduled reminder notification.
- Background/OTA model download (react-native-background-downloader) over Wi-Fi, app killed and reopened, then request an AI-drafted plan.
- Verify no HealthKit-related UI/errors appear — the health-connect surface should be hidden or gracefully absent on Android.

## Reference basis

- Play Console help — create an app: https://support.google.com/googleplay/android-developer/answer/9859152
- Data safety form: https://support.google.com/googleplay/android-developer/answer/10787469
- EAS submit for Android: https://docs.expo.dev/submit/android/
- EAS build config reference: https://docs.expo.dev/build-reference/android-builds/
- Google Play target API level requirements: https://support.google.com/googleplay/android-developer/answer/11926878

## Still needed before this can ship

- Google Play Console developer account (separate from the Apple Developer account already on file).
- Google Cloud service account JSON key with Play Console release permissions, referenced from `eas.json` (not committed).
- Public privacy-policy URL and finalized store-listing copy/screenshots/feature graphic.
- A decision on whether the Data Safety form needs "data shared with third parties" answers (depends on any analytics/crash-reporting SDKs actually wired in — verify in code before answering).
- Device validation of the full flow above on a physical Android device.
