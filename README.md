# AI Weight Coach 🏃‍♀️🤖

A premium AI-powered health coaching app — not a calorie calculator. Built to feel
like a blend of Apple Health, WHOOP, Noom, Oura and MyFitnessPal, with intelligent
coaching, personalized meal & workout plans, and a beautiful, animated UI.

## ✨ Features

- **Animated splash & onboarding** — 17-step onboarding that feeds a real plan engine
- **AI plan engine** — evidence-based BMI, BMR (Mifflin-St Jeor / Katch-McArdle), TDEE,
  protein-first macros, calorie targets, and a week-by-week weight prediction with
  **dynamic metabolic adaptation** (TDEE drops as you lose weight)
- **Dashboard** — gradient goal card, 5 animated progress rings, daily macro targets,
  animated weight timeline, AI coach insight card, weekly milestones
- **Meal plan** — AI-generated daily meals matched to your diet & allergies, expandable
  recipe cards with regenerate + logging, and an auto-grouped grocery list with a
  shopping mode
- **Workout planner** — walking, running, gym, home, HIIT, yoga & stretching with full
  exercise breakdowns and logging
- **Progress** — weight prediction (1M/3M/6M/1Y), health-composition gauges (BMI, body
  fat, BMR, TDEE), lean/visceral rings, weekly activity chart, AI insights & achievements
- **AI Coach chat** — grounded, personalized answers about meals, macros, workouts and
  progress, with suggested prompts and a medical disclaimer
- **Settings** — profile, units (metric/imperial), automatic light/dark theme,
  notifications, health integrations, data export & account management
- **Light & Dark mode** — switches automatically with the system, or lock it manually

## 🧱 Tech Stack

- React Native + Expo (SDK 51) + TypeScript (strict)
- Expo Router (file-based, typed routes)
- React Native Reanimated + Gesture Handler (animations throughout)
- React Native SVG (custom animated charts, rings & gauges)
- Zustand + MMKV (offline-first persisted state)
- TanStack Query, React Hook Form, Zod
- Expo Blur / Linear Gradient (glassmorphism)
- Lucide icons

## 📁 Architecture

Feature-based, scalable structure:

```
app/                     # Expo Router routes
  _layout.tsx            # providers (theme, query, gesture, safe-area)
  index.tsx              # animated splash
  welcome.tsx
  onboarding.tsx         # 17-step flow
  ai-loading.tsx
  (tabs)/                # Dashboard, Meals, Workouts, Progress, Coach, Settings
src/
  theme/                 # colors, tokens, ThemeProvider (light/dark)
  components/            # reusable UI (Screen, GlassCard, PillButton, ProgressRing,
                         #   WeightChart, Gauge, BarChart, SegmentedControl, …)
  features/onboarding/   # onboarding-specific inputs
  lib/                   # calculations, planEngine, mealGenerator, coach, format
  store/                 # zustand stores (user, settings, logs) + MMKV adapter
  data/                  # meal, workout & achievement libraries
  types/                 # shared domain types
```

## 🚀 Getting Started

```bash
npm install
npm start          # then press i / a, or scan the QR with Expo Go
```

Other scripts:

```bash
npm run ios        # open iOS simulator
npm run android    # open Android emulator
npm run typecheck  # tsc --noEmit
npm test           # jest (calculation engine unit tests)
```

## 🧪 Quality

- Strict TypeScript, path aliases (`@/*`)
- Unit-tested calculation engine (BMI, BMR, TDEE, macros, prediction)
- Offline-first via MMKV with an in-memory fallback for web/tests
- Atomic, reusable components with a single design-token source of truth

> The rule-based AI coach and meal generator are designed so the reasoning layer can
> be swapped for a Claude-powered endpoint without touching the UI.
