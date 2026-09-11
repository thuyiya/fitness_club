# 01 --- Technical Architecture

## High-level architecture

``` text
iOS / Android App
       |
       | HTTPS REST API
       v
Node.js Backend
       |
       +---- MongoDB Atlas
       |       ├── users
       |       ├── gyms
       |       ├── memberships
       |       ├── plans
       |       ├── assignments
       |       ├── logs
       |       └── progress
       |
       +---- Object Storage
       |       └── meal photos / progress photos / exercise media
       |
       +---- Firebase Auth
       |
       +---- Firebase Realtime Database
               └── chat / presence / unread state
```

## MongoDB Atlas

Use the free tier during development/MVP.

MongoDB is the application source of truth for structured business data.

Store:

-   accounts
-   profiles
-   coach/member relationships
-   gyms and locations
-   memberships
-   exercises
-   workout plans
-   meal plans
-   plan templates
-   assignments
-   workout logs
-   meal logs
-   body metrics
-   goals
-   health summaries
-   notifications
-   audit information

Do not store large images/videos directly inside MongoDB documents.

## Firebase Realtime Database

Use Firebase RTDB specifically for realtime chat.

Store:

-   conversations
-   messages
-   typing indicators
-   online/offline presence where appropriate
-   unread counters
-   lightweight chat metadata

Keep the business profile/member/plan source of truth in MongoDB.

## Node.js backend

Responsibilities:

-   authorization
-   business rules
-   REST API
-   MongoDB access
-   plan assignment
-   progress aggregation
-   notification orchestration
-   HealthKit data ingestion
-   validation
-   audit logging
-   signed media upload URLs
-   reporting

## Important rule

The mobile client should not directly mutate critical MongoDB business
data.

The client calls the Node.js API. The backend validates the user's role
and permissions before changing data.

## Suggested backend structure

``` text
src/
  config/
  modules/
    auth/
    users/
    gyms/
    members/
    exercises/
    workout-plans/
    meal-plans/
    templates/
    assignments/
    logs/
    progress/
    health/
    chat/
    notifications/
  middleware/
  shared/
  jobs/
  app.ts
```

## API conventions

Use versioned endpoints:

`/api/v1/...`

Return consistent:

``` json
{
  "success": true,
  "data": {},
  "error": null
}
```

Errors should contain stable machine-readable codes.
