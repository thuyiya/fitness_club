# 21 --- Testing Plan

## Unit tests

Test:

-   plan calculations
-   assignment rules
-   permissions
-   progress aggregation
-   notification rules
-   health summary processing

## API tests

Test:

-   authentication
-   authorization
-   CRUD
-   invalid payloads
-   cross-gym access prevention

## Mobile tests

Critical flows:

### Coach

Sign up → Create gym → Add member → Create plan → Assign plan → View
progress → Chat

### Member

Join coach → View plan → Complete workout → Log meal → Upload photo →
Connect Health → View progress → Chat

## Security tests

Attempt:

-   member accessing another member
-   coach accessing another gym
-   inactive user accessing data
-   invalid Firebase chat membership
-   expired token
-   manipulated role payload

## UX tests

Test with real small-gym coaches.

Ask:

-   Can you add a member without help?
-   Can you create a plan?
-   Can you reuse a plan?
-   Can you tell who needs attention?
-   Can a member understand what to do today?
-   Can you find a member's progress in under 10 seconds?

## Performance

Monitor:

-   dashboard response time
-   member list response time
-   plan loading
-   image upload time
-   chat latency
-   HealthKit sync time
