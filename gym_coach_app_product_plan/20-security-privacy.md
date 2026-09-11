# 20 --- Security & Privacy

## Authentication

-   Short-lived access tokens
-   Secure refresh/session handling
-   Password reset through trusted auth provider
-   Never store plaintext passwords

## Authorization

Every API request must verify:

1.  authenticated user
2.  role
3.  gym membership/ownership
4.  resource ownership/access

## Health data

Health information needs additional care.

-   Request minimum permissions
-   Explain usage
-   Store minimum necessary data
-   Encrypt in transit
-   Restrict access
-   Provide deletion/export strategy
-   Do not expose one member's data to another member

## Photos

Meal/progress photos are private by default.

Use signed URLs or authenticated media delivery.

## Chat

Do not expose private chat paths to unauthorized users.

Firebase security rules must enforce conversation membership.

## Audit

For important coach actions, consider audit events:

-   plan assigned
-   plan changed
-   member archived
-   gym changed
-   health connection changed

## Compliance planning

Before production launch, review:

-   privacy policy
-   terms
-   Apple HealthKit rules
-   App Store privacy requirements
-   local privacy/data protection obligations
-   third-party SDK data collection

This product should not present itself as a medical diagnostic service.
