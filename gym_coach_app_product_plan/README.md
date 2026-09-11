# Gym Coach App --- Product & Build Plan

## Product idea

A mobile-first coaching platform built for small and independent gyms. A
gym instructor/coach can manage multiple gym locations, customers,
workout plans, meal plans, templates, daily progress, communication and
results from one simple app.

Members use the same app to follow assigned plans, log workouts and
meals, upload meal photos, record weight/body measurements, connect
Apple Health, and communicate with their coach.

## Core promise

**For coaches:** less spreadsheet/WhatsApp/manual work, better
visibility into every member, reusable plans and simple daily coaching.

**For members:** one place to know what to do today, record what
happened, and get guidance from their coach.

## Initial stack

-   Mobile app: iOS-first, with Android as a planned phase
-   Backend: Node.js
-   Database: MongoDB Atlas Free tier initially
-   Chat: Firebase Realtime Database
-   Authentication: Firebase Authentication or another token-based auth
    layer, with the Node.js backend remaining the application API
-   Health: Apple HealthKit on iOS
-   File/media storage: object storage to be selected before
    implementation
-   API style: REST initially
-   Deployment: low-cost cloud deployment initially

## Product principles

1.  Coach-first, not enterprise-gym-first.
2.  Make the common action possible in 1--3 taps.
3.  Today matters more than complicated analytics.
4.  Templates save coaches time.
5.  Members should never wonder what they need to do next.
6.  The coach gets useful exceptions, not endless data.
7.  Keep the UI calm, modern and premium without feeling expensive or
    complicated.

## Main navigation

### Coach

Home · Members · Plans · Gyms · More

### Member

Home · Plan · Log · Progress · More

Chat can be accessible from member profiles and a dedicated inbox
without becoming the main navigation focus.

## Build order

1.  Product foundation + authentication
2.  Coach onboarding + gyms
3.  Member management
4.  Workout plans
5.  Meal plans
6.  Plan templates + assignment
7.  Member daily logging
8.  Coach daily summary
9.  Chat
10. Apple Health integration
11. Progress + analytics
12. Notifications
13. Polish, testing and launch
