# App Store copy-paste kit

Prepared 11 September 2026 for version 1.0.0.

Create the app under **I VIDANELAGE THUSITHA PRADEEP MADHUSANKA JAYALATH**. Confirm that exact provider/team in App Store Connect before creating the record. Apple derives the seller name from the enrolled account; the copyright field does not change it.

Use the field values below. The app name still needs to be available in App Store Connect.

## Name (19/30 characters)

```text
Nutrition + Fitness
```

## Subtitle (27/30 characters)

```text
Meal plans & daily workouts
```

## Primary Language

```text
English (U.S.)
```

## Primary Category

```text
Health & Fitness
```

## Bundle Id

```text
com.glitchfy.nutritionfitness
```

## Sku

```text
nutrition-fitness-ios
```

## Version

```text
1.0.0
```

## Copyright

```text
2026 I VIDANELAGE THUSITHA PRADEEP MADHUSANKA JAYALATH
```

## Promotional Text (153/170 characters)

```text
Plan meals, follow daily workouts, and see progress with Apple Health. Keep a private photo journal and use on-device AI after a one-time model download.
```

## Description (2326/4000 characters)

```text
Make daily nutrition and movement easier to follow.

Nutrition + Fitness brings meal planning, bodyweight routines, a photo journal, and Apple Health progress into one simple space. Set your goal, build your plan, and take the next small step.

YOUR MOVEMENT TODAY
See your scheduled session, walking target, and estimated activity calories. Understand how your estimated daily energy needs and food target fit together, without counting exercise calories twice.

BUILD A WEEK THAT FITS
Choose a 15, 25, or 40-minute session, a gentle or steady starting intensity, and your preferred number of movement days. Generate a weekly routine on your device, with strength sessions, recovery days, illustrated movement guides, sets, repetitions, and rest cues.

MEALS AROUND YOUR GOAL
Create a daily menu based on your calorie target and dietary preferences. Explore recipes, regenerate meals, view a grocery list, and log calories and protein.

A PRIVATE PHOTO JOURNAL
Save meal photos and progress photos with your own notes. Add optional calorie and protein values from your meal plan or a food label. Photos are journal entries; the app does not estimate nutrition from images.

SEE YOUR APPLE HEALTH PROGRESS
With your permission, view steps, active energy, exercise minutes, distance, workouts, and weight from Apple Health. Review recent activity and shared weight readings alongside your plan. Apple Health access is read-only and depends on compatible hardware, shared permissions, and available data.

AI COACHING ON YOUR DEVICE
Ask for meal ideas or a custom exercise routine using a downloadable language model. AI coaching requires an initial download of approximately 940 MB and available device storage. After setup, replies are generated on your device. Core meal and exercise planning and your journal can be used offline.

No account is required. Your profile, logs, saved plans, and journal are stored locally; the app does not upload them for AI processing.

Nutrition + Fitness provides general fitness and wellness information, not medical diagnosis or treatment. Calorie burn, body metrics, and goal timelines are estimates, not guaranteed outcomes. AI suggestions may be inaccurate. Review ingredients and adapt exercise to your needs; consult a qualified professional for individual medical or dietary advice.
```

## Keywords (95/100 UTF-8 bytes)

```text
workout,meal planner,calorie,protein,bodyweight,exercise,health,weight,food diary,offline,coach
```

## Review Notes (2801/4000 characters)

```text
Nutrition + Fitness is a fitness and nutrition planning app. No sign-in, account, subscription, or in-app purchase is required in this version. Sign-in required: No.

Getting started:
1. Complete the welcome/profile flow using a test adult profile and choose a goal.
2. Home shows today's movement plan, estimated active-calorie target, food target, and estimated total daily energy needs.
3. Tap the center + button for Workouts, Meal log, Exercise plan, Meal plan, Change goals, and Progress photo.
4. Exercise plan > Generate / change plan offers 15/25/40-minute sessions, gentle/steady intensity, and movement days. Generate my week offline builds a local routine. Open a scheduled strength day to view diagrams, sets, repetitions and completion controls. Recovery days are intentional.
5. Meal plan generates a local daily menu. Tap a meal to see recipe details and logging; Groceries shows the shopping list. Build with AI coach opens the downloadable local AI feature.
6. Meal log and Progress photo support the camera or photo picker. Choose a test image, enter a note, and save it locally. Meal calories/protein are optional manual values. There is no image recognition or automatic calorie estimation.
7. In Settings or Progress, connect Apple Health and choose categories to share. The app requests read access to steps, active energy, exercise time, walking/running distance, workouts, and body mass. It does not write HealthKit data. Existing shared Health data is needed to populate charts; unavailable readings appear as dashes rather than invented activity.
8. AI coaching uses Qwen2.5 1.5B Instruct through llama.rn. A one-time model download of approximately 940 MB is required; the app attempts a Wi-Fi download on initial launch. You can also use Settings > Coach > Download coach. Leave enough storage and allow the download to finish. Subsequent inference is local. The built-in daily meal and exercise planners do not need this model. Generation speed depends on the device.

Privacy and screenshots:
HealthKit samples are read into memory for display. Profile, manual logs, saved plans, messages and journal photos remain in the app's local storage. Model files are fetched from Hugging Face; app updates use Expo's configured update service. No user health/photo content is sent to a remote AI service.

The App Store screenshots use a fictional adult profile and illustrative activity/weight readings in an isolated screenshot build. These sample readings are not preloaded in the submitted app, and do not represent promised results. No special reviewer account or hidden feature activation is needed.

The app provides general wellness information. Energy expenditure and progress projections are estimates; it does not promise targeted fat loss or offer medical diagnosis.
```

## What's New — optional for a later update; not required for the first version

```text
Welcome to Nutrition + Fitness.

• Daily meal plans and grocery lists
• Weekly bodyweight exercise plans with illustrated guides
• Activity targets and read-only Apple Health progress
• Private meal and progress photo journals
• On-device AI coaching after an initial model download
```

## Testflight What To Test

```text
Please test onboarding and goal changes; generate meal plans and grocery lists; create 15/25/40-minute exercise plans; review strength and recovery days; complete and log a session; save and delete meal/progress photos; and confirm data remains after restarting.

On a real compatible device, test Apple Health with all, partial, and denied read permissions, missing data, refresh, and disconnect. Check steps, active energy, exercise minutes, distance, workouts, and weight against Apple Health.

Download the AI model over Wi-Fi, restart the app, then test coaching in airplane mode. Check interrupted downloads, low-storage handling, and model deletion/redownload. Core planners and journal should work offline without the model.

Report the device model, OS version, app build, reproduction steps, and screenshots with personal health information removed.
```

## Fields you must complete

| App Store Connect field | What to enter |
|---|---|
| Support URL | `[PUBLIC_SUPPORT_URL]` — a live HTTPS page with contact information; use the support-page template. |
| Privacy Policy URL | `[PUBLIC_PRIVACY_POLICY_URL]` — a live HTTPS policy page; use the draft after reviewing it. Also make the policy accessible inside the app. |
| Marketing URL | Optional. Leave blank until a real product website exists. |
| Review contact | Your reachable first/last name, email, and phone number. These are not the public support page. |
| Price and territories | Your choice. No payment system is implemented in this version. |
| Release option | Choose manual release if you want to decide when to make the approved version public. |
| Age rating | Complete Apple's current questionnaire using the guidance in `SUBMISSION-GUIDE.md`; Apple calculates the rating. |
| App Privacy | Review `PRIVACY-ANSWERS.md` before selecting answers. |
| Content rights | Confirm you have rights to all app assets, recipes, libraries, and downloaded model distribution. |
| Encryption | Current config says no non-exempt encryption. Confirm this matches the final binary and answer Apple's build questionnaire. |

Do not paste bracketed placeholders into the public listing. Neither public URLs nor support contact information were supplied, so none have been invented.

## Screenshot upload order

Upload files 01 through 06 from each device folder:

1. Daily movement and goal context
2. Today's illustrated exercises
3. Build your week offline
4. One-tap actions
5. Meal plan
6. Apple Health progress

Use `screenshots/iphone-6.9/` for the 6.9-inch iPhone slot (1320 × 2868) and `screenshots/ipad-13/` for the 13-inch iPad slot (2064 × 2752). These are real UI captures with fictional sample data. No screenshot caption field is required. `gallery.html` lets you inspect all images locally.

The 1024 × 1024 icon is in `branding/app-icon-1024.png`. The submitted build supplies the App Store icon; do not upload it as a screenshot. A splash screen is not a separate App Store listing field.

[Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), [version fields](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/), [product-page guidance](https://developer.apple.com/app-store/product-page/).


## iPhone upload dimension correction

If App Store Connect requests 1242 × 2688 or 1284 × 2778, use **screenshots/iphone-6.5/**. All six JPEGs in this folder are exactly **1284 × 2778**. The original iphone-6.9 folder is only for the 6.9-inch slot. These additional exports fit the existing captures proportionally, with minimal navy side padding and no content cropping.

Apple specification: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
