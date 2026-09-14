# Submission guide

## Create the correct app record

- Select **I VIDANELAGE THUSITHA PRADEEP MADHUSANKA JAYALATH** as the provider/team. This is the account requested by the owner.
- Platform: iOS. Name: Nutrition + Fitness (subject to availability). Primary language: English (U.S.).
- Bundle ID: `com.glitchfy.nutritionfitness`. Register/select it under the same team used to sign the app, with HealthKit enabled.
- Suggested unique SKU: `nutrition-fitness-ios`. A SKU is internal, not the public name.
- The current project supports iPhone and iPad, so use both screenshot folders.

## Add the listing

Copy `COPY-PASTE.md` or individual `metadata/*.txt` fields. Add the six JPEGs in numeric order to each device slot. No app-preview video is required for this kit. The icon is supplied by your uploaded binary. Price, availability, release timing and any regional business declarations are your own decisions.

Name/subtitle: maximum 30 characters each. Promotional text: 170 characters. Description: 4,000 characters. Keywords: 100 UTF-8 bytes. Counts are verified in `metadata/field-lengths.json`. See [Apple's app information fields](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/) and [platform version fields](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/).

## Complete the remaining information

- Public Support URL with a working contact method.
- Public Privacy Policy URL, plus an accessible policy link inside the app. Templates are provided, but still contain publisher placeholders.
- App Review contact name, email and phone. Set **Sign-in required: No** for the current app.
- App Privacy answers based on the final binary and provider behavior; see `PRIVACY-ANSWERS.md`.
- Current age-rating questionnaire: disclose the wellness/nutrition guidance and AI-generated advice accurately. The inspected app has no public user-to-user messaging, public photo sharing, ads, gambling or unrestricted web browser. Its journal is local. Answer the actual questionnaire wording; do not claim no wellness information. Apple determines the rating. The product targets adults; any voluntary higher minimum-age setting is a publisher decision.
- Confirm content rights, open-source/model license obligations, and the encryption questionnaire against the release binary. Current `ITSAppUsesNonExemptEncryption` is false; this is a configuration declaration, not a completed export assessment.
- Complete any agreements, tax/banking or regional trader requirements displayed for your account, using your actual details.

## Before uploading the final build

1. Use a production App Store build, not the simulator/debug app used for these screenshots. Keep its version/bundle ID consistent with the record.
2. Test HealthKit permission handling and real readings on a compatible physical device. The screenshot fixture is not evidence of real HealthKit integration testing.
3. Test the model download, interruption recovery and offline inference on the intended supported devices. Screenshots do not establish AI speed or memory reliability.
4. Test meal/exercise generation, camera/photo selection, persistence and deletion in the release build.
5. Confirm current Xcode/SDK submission requirements in App Store Connect when building; this kit does not certify the submitted binary or all supported OS versions.
6. Ensure screenshot-only data/code from `/tmp/nutrition-appstore-capture` is not included in the release source. It was kept outside the project app code.
7. Review all public text for placeholders, attach the processed build, then submit for review when ready. “What's New” text is provided for reuse; it is not required for an initial version.

[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) and [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).

## What this kit verifies

Twelve real UI captures from the current React Native screens; correct screenshot dimensions and opaque JPEG encoding; field limits; asset manifest and checksums. It does not publish the app, sign a release, host your policy/support pages, complete legal declarations, or verify production device behavior.


## iPhone upload dimension correction

If App Store Connect requests 1242 × 2688 or 1284 × 2778, use **screenshots/iphone-6.5/**. All six JPEGs in this folder are exactly **1284 × 2778**. The original iphone-6.9 folder is only for the 6.9-inch slot. These additional exports fit the existing captures proportionally, with minimal navy side padding and no content cropping.

Apple specification: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
