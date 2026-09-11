# 16 --- MongoDB Data Model

## Core collections

### users

``` text
_id
role
name
email
phone
avatarUrl
status
createdAt
updatedAt
```

### gyms

``` text
_id
ownerId
name
address
city
country
coverImageUrl
status
createdAt
updatedAt
```

### gymMembers

``` text
_id
gymId
userId
role
status
joinedAt
```

### coachMembers

``` text
_id
coachId
memberId
status
createdAt
```

### exercises

``` text
_id
name
description
muscleGroups[]
equipment[]
difficulty
imageUrl
videoUrl
instructions[]
createdAt
```

### plans

``` text
_id
ownerId
gymId
type
name
goal
difficulty
durationWeeks
weeks[]
status
createdAt
updatedAt
```

### templates

Similar to plans but reusable.

### assignments

``` text
_id
planId
memberId
assignedBy
startDate
endDate
status
customizations
```

### workoutLogs

``` text
_id
memberId
assignmentId
date
exercises[]
duration
caloriesBurned
completedAt
notes
```

### mealLogs

``` text
_id
memberId
date
mealType
photoUrl
foods[]
calories
protein
carbs
fat
notes
loggedAt
```

### bodyMetrics

``` text
_id
memberId
date
weight
bodyFat
measurements
progressPhotoUrls[]
```

### healthSummaries

``` text
_id
memberId
date
steps
activeEnergy
workoutMinutes
heartRateSummary
sleepSummary
source
```

## Data design rules

-   Use references for relationships.
-   Avoid giant member documents.
-   Keep logs append-oriented.
-   Add indexes for `memberId + date`.
-   Add indexes for `gymId`.
-   Store timestamps in UTC.
-   Keep user-facing timezone separately.
