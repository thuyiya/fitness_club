# 02 --- Roles & Permissions

## Roles

### Platform Admin

Future role for operating the SaaS.

### Gym Owner / Coach

The primary MVP role.

Can:

-   create/manage gyms
-   add members
-   invite members
-   create plans
-   create templates
-   assign plans
-   review member activity
-   review progress
-   chat with members
-   manage coach profile

### Assistant Coach

Future or phase-2 role.

Can manage assigned members but has restricted gym/settings access.

### Member

Can:

-   view assigned plans
-   complete workouts
-   log meals
-   upload meal photos
-   record body metrics
-   connect HealthKit
-   view progress
-   chat with coaches
-   manage personal settings

## Permission model

Permissions should be checked at the backend.

Examples:

-   `gym.read`
-   `gym.manage`
-   `member.read`
-   `member.manage`
-   `plan.create`
-   `plan.assign`
-   `member.progress.read`
-   `chat.use`
-   `health.write`

## Multi-gym rule

A coach can belong to multiple gym locations.

The active gym context should be explicit in the coach UI:

`All Gyms` or `City Fitness — Main`

Every gym-scoped query must be authorized against the coach's
membership/ownership.
