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
