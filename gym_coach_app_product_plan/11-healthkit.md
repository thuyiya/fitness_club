# 11 --- Apple HealthKit

## Goal

Let members optionally connect Apple Health so activity data can be
captured without manual entry.

## Candidate data

Subject to Apple permissions and app review requirements:

-   steps
-   active energy
-   workouts
-   heart rate
-   sleep
-   weight
-   other relevant HealthKit quantities

Only request permissions that the feature actually needs.

## UX

`More → Health → Connect Apple Health`

Explain why each category is useful before requesting permission.

Show:

-   Connected
-   Last synced
-   Data categories enabled
-   Manage connection

## Data strategy

HealthKit is the user's source on device.

The app can sync selected aggregates to the Node.js backend for coach
dashboards and progress views.

Avoid uploading unnecessary raw health data.

## Privacy

Health data is sensitive. Implement:

-   explicit consent
-   minimal collection
-   secure transport
-   access control
-   deletion handling
-   clear privacy explanation

Do not use health data for unrelated advertising or profiling.
