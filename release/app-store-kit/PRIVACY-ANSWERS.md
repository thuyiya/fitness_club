# App Privacy answers — verify against the submitted build

This worksheet reflects the inspected source, not a completed audit of network providers or the final distribution binary. Do not automatically select “Data Not Collected” solely because the app is designed for offline use.

Apple defines collection in terms of transmitting data off the device in a way that permits access beyond servicing the request in real time. Data processed only on-device is not collected for this label. See [Apple's App Privacy details](https://developer.apple.com/app-store/app-privacy-details/).

## What the current app does

| Data or feature | Current handling | Disclosure implication |
|---|---|---|
| Profile, age, body measurements, goal and dietary preferences | Local persistent storage; used for planning | On-device use alone is not App Store data collection. |
| Calories, protein, water and manual activity logs | Local persistent storage | Same. |
| Meal and progress photos and notes | Copied into local app storage; user can delete entries | Same. There is no image-analysis upload. |
| AI prompts, replies and saved plans | Local storage and local inference | No remote inference service receives the content in the inspected code. |
| Apple Health samples | Read-only queries; samples held in memory; only enabled/disabled preference persisted | No HealthKit upload found. HealthKit itself remains the source of the samples. |
| Model download | HTTPS request to Hugging Face and its delivery infrastructure | Providers receive network metadata such as IP address; verify retained data, purposes and identifiers before choosing the label. |
| Expo Updates | Update endpoint configured in app.json | Verify enabled production behavior and data transmitted/retained by Expo, including update request metadata. |
| Analytics, ads, tracking | No analytics/ad backend or tracking logic identified in app source | Verify the final dependencies and release build; do not declare tracking just because the app accesses HealthKit. |
| Support messages | Only if the user contacts the support channel you publish | Add the actual handling/retention to your policy; assess Apple's optional-disclosure criteria. |
| Device backups / Photos library | Controlled by iOS and the user's settings | Local app storage does not imply backups can never leave the device. Do not promise “never in iCloud.” |

## How to answer

1. Inspect the final release build's network behavior and each third-party provider's disclosures.
2. If neither you nor partners collect data under Apple's definition, select “No, we do not collect data from this app.”
3. If collection occurs, select the actual categories, purposes, whether linked to identity, and whether used for tracking. Do not guess those answers from the name of a library.
4. Keep Health & Fitness / Photos categories unselected only when those contents truly remain on-device and are not collected. A permission request alone is not collection.
5. Publish a privacy policy with the developer identity, contact, local processing, permissions, network downloads/updates, retention and deletion information. Make it accessible in the app.

The current source does not show a public privacy-policy link in Settings. Add your final policy URL there before submission. Review [HealthKit privacy requirements](https://developer.apple.com/documentation/healthkit/protecting-user-privacy) and [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
