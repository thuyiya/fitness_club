# Nutrition + Fitness — iOS release

Apple Developer account: I VIDANELAGE THUSITHA PRADEEP MADHUSANKA JAYALATH

App: Nutrition + Fitness
Bundle ID: com.glitchfy.nutritionfitness
Expo project: @glitchfy/fitness-club

This is a new bundle identifier. Earlier Solace signing credentials and an existing Solace App Store record cannot be used for an update under this identifier.

## Release description draft

Make nutrition and movement part of your day. Build an offline exercise schedule, follow daily exercise cards, save meal plans, and keep private meal and progress photo journals. Connect Apple Health to see shared steps, active energy, exercise minutes, walking/running distance, workouts and weight trends. A downloadable on-device text coach can help draft meal and workout plans.

The built-in exercise generator uses local rules and illustrated movement guides. AI coaching requires a one-time model download. Photos are journal entries, not automated calorie estimates. Calorie targets and weight projections are estimates.

## What to test

- Open + → Exercise plan. Generate a week with 15, 25 or 40 minute sessions and gentle/steady intensity.
- Verify recovery days, exercise completion persistence, and one session log per day.
- Connect Apple Health on an iPhone. Test all permissions, partial permissions, denied access, empty data and disconnect.
- Check that Apple Health values refresh without adding duplicate manual activity.
- Compare Apple Health weight and active-energy trends to the source app.
- Test meal/progress photo permission, saving, restart and deletion offline.
- Download the AI model, enable airplane mode, and request/save a custom plan.

## Submission requirements still needed

- Apple Developer access for registering the new bundle ID and enabling HealthKit.
- Distribution certificate and HealthKit-enabled provisioning profile for this bundle ID (EAS currently has none).
- App Store Connect app record and its numeric Apple ID for EAS Submit.
- Public support and privacy-policy URLs, screenshots, age rating, privacy disclosures and review contact details.
- Device validation of HealthKit and photo permissions.

EAS Submit uploads to App Store Connect/TestFlight; public release also requires App Review and release configuration.

## Reference basis

- Apple Health authorization: https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data
- Adult movement guidelines: https://www.cdc.gov/physical-activity-basics/guidelines/adults.html
- Apple upload requirements: https://developer.apple.com/news/upcoming-requirements/
- EAS submission: https://docs.expo.dev/submit/ios/

## Brand asset

Built-in ImageGen edit of the existing leaf/dumbbell logo. Prompt: preserve the logo silhouette, replace orange with a violet-to-cyan gradient, use midnight navy background, no text or additional objects. Saved in assets/icon.png, assets/logo-mark.png, assets/splash.png, assets/adaptive-icon.png and assets/favicon.png.

## Account verification — September 11, 2026

App Store Connect displays the requested individual account. The Developer portal browser session currently lists other organizational teams; do not register this app there. EAS Apple authentication is waiting for two-factor verification before its teams can be checked. No app record, certificate or provisioning profile has been created during this release attempt.

## Credentials — set up September 11, 2026

Bundle ID `com.glitchfy.nutritionfitness` is registered under Apple Team 774S6UKP2X (I Vidanelage Thusitha Pradeep Madhusanka Jayalath, Individual), same team as the existing `@glitchfy/within` / `@glitchfy/solace` / `@glitchfy/snaptab` EAS projects. Reused their existing ASC API key (`AuthKey_A7P9DGHT6X.p8`, Key ID `A7P9DGHT6X`, Issuer `7d5d55b6-1b82-48b3-947c-6a7d65f5ab83`) rather than creating a new one — it's scoped to the team, not the app.

EAS now holds a Distribution Certificate (reused cert `QBLP3ZHN4B`, shared with the sibling apps above) and a freshly generated Provisioning Profile (`XJWR3747LB`) for this bundle ID. Both are marked active on the `@glitchfy/fitness-club` EAS project, so future builds should no longer need interactive Apple login/2FA.

**Build/submit going forward:**

```
npm run build:ios     # eas build --platform ios --profile production
npm run submit:ios     # eas submit --platform ios --latest
```

These source `.env.local` (gitignored, not committed) for the ASC API key env vars: `EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`, `EXPO_ASC_ISSUER_ID`, `EXPO_APPLE_TEAM_ID`. See `scripts/build-ios.sh` / `scripts/submit-ios.sh`. The env vars are mainly needed if credentials ever need to be regenerated (cert renewal, new profile); routine builds reuse the credentials already stored on EAS.

First production build (build number 4) was submitted via this flow and is uploading to EAS Build for TestFlight.

## Rejection — build 6 crashed on launch (September 17, 2026)

App Review (Guideline 2.1(a)) reported build 1.0.0 (6) crashing on launch on an iPhone 17 Pro Max running iOS 27.0.

Root cause: build 6 was compiled against the iOS 27 SDK (App Store Connect reports `sdkBuild 24A430`) because the
EAS `production` profile used `"image": "latest"`, which pointed at Xcode 27 at the time. Apps linked against the iOS 27
SDK must adopt the UIScene lifecycle (Apple Technote TN3187); UIKit traps at launch otherwise
(`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`, SIGTRAP before `didFinishLaunching`). React Native 0.74 /
Expo SDK 51 does not adopt scenes, so every Xcode 27 build of this app crashes on iOS 27. Reproduced locally on the iOS 27.0
simulator with a Release build from Xcode 27.0.

Fix applied: `eas.json` pins the iOS production image to `macos-tahoe-26.5-xcode-26.6` (iOS 26 SDK). Apps linked against
the iOS 26 SDK are exempt from the scene requirement and run on iOS 27. Do not switch back to `latest` or any Xcode 27
image until the app adopts UIScene (Expo SDK 57+ has `expo-build-properties` → `ios.enableSceneSupport`). Apple will
eventually require the iOS 27 SDK for submissions, so plan the SDK upgrade before that deadline.

Rebuild/submit: the EAS project belongs to the `glitchfy` Expo account; `eas whoami` must show that account (not `tj_cl`)
before `npm run build:ios` / `npm run submit:ios`.
