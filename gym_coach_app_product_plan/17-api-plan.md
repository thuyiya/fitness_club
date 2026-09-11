# 17 --- API Plan

## Authentication

``` text
POST /api/v1/auth/session
GET  /api/v1/me
```

## Gyms

``` text
GET    /api/v1/gyms
POST   /api/v1/gyms
GET    /api/v1/gyms/:gymId
PATCH  /api/v1/gyms/:gymId
```

## Members

``` text
GET    /api/v1/gyms/:gymId/members
POST   /api/v1/gyms/:gymId/members
GET    /api/v1/members/:memberId
PATCH  /api/v1/members/:memberId
```

## Plans

``` text
GET    /api/v1/plans
POST   /api/v1/plans
GET    /api/v1/plans/:planId
PATCH  /api/v1/plans/:planId
POST   /api/v1/plans/:planId/assign
```

## Templates

``` text
GET    /api/v1/templates
POST   /api/v1/templates
POST   /api/v1/templates/:templateId/duplicate
```

## Logs

``` text
POST /api/v1/workouts/logs
POST /api/v1/meals/logs
POST /api/v1/body-metrics
GET  /api/v1/members/:memberId/activity
```

## Health

``` text
POST /api/v1/health/sync
GET  /api/v1/health/summary
```

## Progress

``` text
GET /api/v1/members/:memberId/progress
GET /api/v1/members/:memberId/summary
```

## Notifications

``` text
GET   /api/v1/notifications
PATCH /api/v1/notifications/:id/read
```

## Media

Prefer signed upload URLs:

``` text
POST /api/v1/media/upload-url
```

The app uploads directly to object storage, then sends the resulting
asset reference to the API.
