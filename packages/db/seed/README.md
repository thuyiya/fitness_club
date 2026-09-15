# Seed data

Reference and catalog data for Wellness 2.0, kept as JSON so it can be reviewed
in a diff before it ever reaches Postgres.

Run the validator before loading anything:

```sh
node packages/db/seed/validate.mjs
```

It parses every file, enforces unique ids, resolves every cross-file reference,
checks values that back a Postgres enum, and recomputes each meal's macros from
its ingredients. It exits non-zero on failure, so it can gate CI.

## Layout

`reference/` holds finite lookup tables — closed vocabularies that the app and
the seeder both read. `catalog/` holds the content rows that get inserted.

### reference/

| File | What it is | Where it lives at runtime |
| --- | --- | --- |
| `activity-levels.json` | 5 PAL multipliers (1.2 – 1.9) for TDEE | app constant; the chosen id belongs on `users` |
| `goal-types.json` | 6 goals with calorie deltas and protein g/kg | app constant |
| `muscle-groups.json` | 20 muscles with region and aliases | app constant; ids appear in `exercises.muscle_groups` |
| `equipment.json` | 24 items with a `homeAvailable` flag | app constant; ids appear in `exercises.equipment` |
| `exercise-categories.json` | 10 categories + 11 movement patterns | app constant |
| `disciplines.json` | 4 disciplines: calisthenics, gym, cardio, mobility | app constant; the library's primary browse axis |
| `logging-modes.json` | 5 modes: reps, hold, distance, duration, rounds | app constant; decides which fields the log UI shows |
| `exercise-tags.json` | 14 additive search labels | app constant |
| `difficulty-levels.json` | beginner / intermediate / advanced / elite | app constant; ids appear in `exercises.difficulty` |
| `units.json` | mass, volume and count units | app constant |
| `dietary-tags.json` | 15 tags, plus the 15 `foodClasses` they exclude | app constant |
| `allergens.json` | 15 allergens (US FASTER Act 9 ∪ EU Annex II 14) | app constant |
| `meal-types.json` | the 4 `meal_type` enum values + 4 extra tags | mirrors the `meal_type` enum |
| `goal-metrics.json` | 12 metrics with source, aggregate, comparator, period | app constant; ids appear in `goals.metric` |
| `sport-nutrition-profiles.json` | 22 sports of focus with carb/protein g/kg by goal | app constant; the chosen id belongs on `users` |
| `hydration.json` | 33 ml/kg baseline, clamps, adjustments, quick-add presets | drives `hydration_goals.daily_target_ml` |
| `measurement-sites.json` | 10 tape sites | keys of `body_metrics.measurements` (jsonb) |
| `injury-limitations.json` | 17 limitations with patterns to avoid or prefer | app constant; selections belong on the onboarding form |

### catalog/

| File | Rows | Target table |
| --- | --- | --- |
| `ingredients.json` | 122 foods, per 100 g | `foods` |
| `meals.json` | 18 composed meals | `meals` + `meal_ingredients` |
| `exercises.json` | 85 exercises with MET and progression chains | `exercises` |
| `activities.json` | 64 bouts with Compendium MET values | *no table yet — see below* |
| `survey-templates.json` | 8 templates, 49 questions | `surveys` + `survey_questions` |

## How exercises, activities and sports divide

These three are easy to collapse into one table and very expensive to separate
later. They are kept apart because they are **prescribed, logged and progressed
differently**.

**Exercise** (`catalog/exercises.json` → `exercises`) is a *prescribable
movement*. A coach writes 3 × 8 at 80 kg; the member logs set rows. Calisthenics
and gym work are **both exercises** — a push-up and a bench press are the same
shape of thing, they differ only in where the resistance comes from. That
difference is the `discipline` facet, not a separate table.

**Activity** (`catalog/activities.json`) is a *bout*: duration plus intensity,
no sets. "Played squash for an hour." Energy comes from its MET value. Sports
live here.

**Sport of focus** (`reference/sport-nutrition-profiles.json`) is a *property of
the member*, not of anything they did. A cricketer eats to a cricket profile on
the morning they went cycling. It sets carbohydrate and protein targets in g/kg.

The reference app this data draws on (ZoneIn) merges all three: every log row is
a `MemberExercise` pointing at a `Sport`, and "WEIGHTS" is itself a sport row.
That is coherent for a pure nutrition product — it only ever needs energy and
macros — but it cannot express a set, a rep or a load, so no coach can program
in it. Keeping the split is what lets Wellness 2.0 do both.

The one place they meet: `activities.json` carries seven `training_session`
rows ("Strength training, general", "Circuit training", "HIIT"). These exist so
a member can log a gym session in one tap without a plan, and so the nutrition
side sees work that never went through `workout_logs`. A completed plan-based
workout should roll up to the same energy figure rather than being counted twice.

### The exercise facets are orthogonal

Each answers a different question, and a coach filters on several at once
("calisthenics pull exercises for someone who only has a bar"):

| Facet | Question | Values |
| --- | --- | --- |
| `discipline` | what kind of training? | calisthenics, gym, cardio, mobility |
| `category` | what does it train? | strength, core, hiit, plyometric, balance, … |
| `movementPattern` | how does the body move? | squat, hinge, vertical_pull, carry, … |
| `equipment[]` | what does it need? | 24 items |
| `difficulty` | who can do it? | beginner → elite |
| `loggingMode` | how is it measured? | reps, hold, distance, duration, rounds |
| `tags[]` | anything else worth filtering on | 14 additive labels |

`loggingMode` is the one that most often gets missed. A plank is not "reps", a
farmer's walk is not "reps", and a front lever is held for seconds at a
leverage — an app that only captures sets and reps cannot record any of them.
Current spread: 63 reps, 11 duration, 6 distance, 5 hold.

`difficulty` runs to four levels rather than three because calisthenics skills
(planche, front lever, one-arm pull-up) sit far beyond what "advanced" means for
a barbell lift. The existing catalog in `apps/nutrition-fitness/exercise-db/`
grades 41 of its 451 movements Elite.

## Conventions

**Nutrition is per 100 g of the edible portion**, raw unless the name says
otherwise. `nutrient = grams * per100g / 100`. Energy is cross-checked against
the 4/4/9 kcal factors. The `foods` table stores macros *per serving* with
`serving_size` defaulting to 100 and `serving_unit` to `g`, so a per-100 g block
loads straight in — only change that if you also scale the macros.

**Calorie burn is `kcal = MET * 3.5 * weightKg / 200 * minutes`.** Every
exercise and sport carries a MET from the Compendium of Physical Activities.
Intensity bands follow ACSM: light below 3 METs, moderate 3 – 6, vigorous above 6.

**Progression chains are bidirectional.** If A lists B under `progressions`,
B must list A under `regressions`. The validator enforces both directions.

**Dietary tags are computed, not asserted.** Every food declares `foodClasses`
(meat, dairy, legumes, …), and each dietary tag declares the classes it
excludes. The validator rejects any food or meal that claims a tag its own
ingredients contradict — that is what catches "vegan" on honey.

**Allergens are a safety declaration, not an inference.** They record what the
source declares. A food that declares an allergen may not also carry the
matching "free of" tag; the validator enforces that pairing. Coconut is carried
as a tree nut because the FDA declares it one.

`halal` and `kosher` depend on sourcing, slaughter and certification, none of
which this data captures. `ingredients.json` carries a disclaimer saying so, and
the app must never present them to a member as a guarantee.

`injury-limitations.json` carries a **not medical advice** disclaimer. The app
must surface it wherever those options are shown.


## Loading it

```sh
node packages/db/seed/validate.mjs     # gate: parses, cross-refs, enum drift
pnpm --filter @wellness/db seed        # rows -> Postgres (idempotent, keyed by slug)
pnpm --filter @wellness/db seed:embed  # embeddings (needs migration 0003)
```

`seed.mjs` upserts on `slug`, so a re-run after editing the JSON updates in
place. `embed.mjs` only touches rows with a NULL embedding unless given
`--force`.

## Search and recommendation

Two different mechanisms, deliberately not one.

**Macro targeting is SQL, not vectors.** "450 kcal with 40P/35C/15F" is exact
numeric distance in four known dimensions. It matches on macro RATIO and then
scales the portion, so a 600 kcal meal serves at 0.75x rather than being
discarded. Allergen exclusion is a hard predicate on a GIN index evaluated
before ranking --- "probably no peanuts" is not an acceptable answer, and an
approximate index cannot promise otherwise. See `apps/api/src/lib/recommend.ts`.

**Semantic search is pgvector**, for the queries where the dimensions cannot be
enumerated: "food for after a hard workout" returns the post-workout shake,
and lexical search returns nothing at all for it.

Embeddings are all-MiniLM-L6-v2 (384-d) run locally through ONNX in
`packages/embeddings`. No API, no per-query cost, and no member's food diary
leaves the host.

**Blending the two unconditionally makes results worse.** A one-or-two word
query is someone typing a name: "chiken" must return Chicken breast, but the
embedding model scores "chiken" nearest to "Chia seeds" because it reads a typo
as a concept. So lexical wins name-like queries outright and vectors only pad
the tail; longer phrases fuse both by reciprocal rank. `apps/api/smoke.mjs`
asserts both behaviours.

Lexical matching uses `word_similarity` (`<%`), not `similarity` (`%`): the
query is short and the stored name is a phrase, so whole-string similarity
scores "yogrt" against "Greek yogurt, 0% fat" at 0.19 and drops it. Matching
the best word scores it 0.50. Migration `0004` lowers the threshold to 0.4,
which recovers realistic typos without pulling in noise.

## Schema state

Every gap this corpus assumed is now closed, by migrations `0001`-`0004`:
`exercises` carries all the taxonomy facets plus `met` and the progression
chains; `activities` and `sport_profiles` exist; `workout_log_sets` can record
holds, distances and rounds, so a prescribed plank can actually be logged;
`users` has `sex` (Mifflin-St Jeor needs it), `activity_level`, `goal_type` and
`sport_profile_id`; `meals` and `surveys` accept a NULL owner, which is what
marks a row as platform catalog rather than coach-authored.
