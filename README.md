# Nutrition + Fitness

Offline nutrition, training and health tracking with a violet/cyan interface.

- Home, Coach, central + actions, Progress and Settings.
- Meal and progress photos are copied to app document storage; journal metadata and plans persist in MMKV.
- The on-device text coach requires a one-time model download. Photo recognition is not implemented; nutrition is entered manually.
- Daily menus are generated locally from a filtered recipe library; custom AI plans can be saved from Coach.
- Camera and photo storage require a native development build. After dependency or identity changes, regenerate native projects with `npx expo prebuild --clean`, then rebuild. The app identifier is now `com.glitchfy.nutritionfitness`.

## Development

```sh
npm install
npm run typecheck
npm test -- --runInBand
npm run ios
```

## Apple Health and daily training

Apple Health is implemented in the local `fitness-health` Expo module. It requests read-only access and never writes manual logs into HealthKit. Shared readings stay in memory and refresh from HealthKit; only the connection preference persists. Missing readings do not imply zero activity or prove permissions were granted.

Home → Today’s movement and + → Exercise plan both open the offline daily planner. The generator supports time, intensity and weekly frequency, recovery days, schematic exercise guidance, and persistent completion. Activity energy is estimated above rest and kept separate from the TDEE-based calorie deficit.

See `release/ios-release.md` for release status and device checks.
