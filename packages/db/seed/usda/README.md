# USDA FoodData Central import

Loads the USDA FoodData Central CSV release into `foods`, `food_portions` and
`nutrients`, tagged `source = 'usda'`.

```bash
# full run (stages the CSVs, then both tiers)
DATABASE_URL=postgres://... node packages/db/seed/usda/import.mjs \
  --source ~/Downloads/FoodData_Central_csv_2026-04-30

# one tier at a time, reusing staging tables from a previous run
node packages/db/seed/usda/import.mjs --tiers core    --keep-stage
node packages/db/seed/usda/import.mjs --tiers branded --keep-stage --skip-load
```

| flag | meaning |
| --- | --- |
| `--source <dir>` | the unzipped CSV release |
| `--tiers core,branded` | `core` = Foundation + SR Legacy + FNDDS; `branded` = packaged products |
| `--keep-stage` | leave `usda_stage.*` in place for a follow-up tier |
| `--skip-load` | reuse the staged CSVs instead of re-COPYing 2.8GB |
| `--steps foods,portions,allergens,claims` | run a subset; re-deriving claims alone is ~6 min instead of ~20 |

Idempotent. Rows key on `(source='usda', external_id=fdc_id)`, so a re-run
updates in place — which is also how you re-derive allergens and claims after
changing a rule.

## What the two tiers are for

| tier | rows | nutrients per food | what it is |
| --- | --- | --- | --- |
| core | 13,692 | 65–159 (median 85) | generic whole foods, lab-analysed |
| branded | ~1.9M | ~14 (median) | packaged products, transcribed Nutrition Facts panels |

`is_verified` follows that split: core is government reference data, branded is
manufacturer-declared label data.

Only the core tier has a real micronutrient panel. Branded foods carry the ~14
values the FDA requires on a label and nothing else — so a branded row is the
right answer for "what did I actually eat" and the wrong one for "am I low on
magnesium".

## Design notes

**Everything is per 100 g.** USDA reports per 100 g universally, so
`serving_size = 100` and `serving_unit = 'g'` for every imported row, matching
the existing curated catalog. Unlike that catalog, drinks are *not* relabelled
`ml`: USDA's basis for a drink is still 100 g, and calling it `ml` would apply a
density of 1.0 to everything from cooking oil to syrup. Volumes live in
`food_portions` instead, where the declared unit is preserved.

**Macro columns are floored at zero; the panel is not.** USDA computes
"carbohydrate, by difference" as 100 minus water, protein, fat and ash, which
lands a few hundredths *below* zero on zero-carb foods — raw chicken breast is
-0.43 g. That value stays verbatim in `micronutrients`, because it is what the
source says, but the `carbs_g` column is floored so a member's daily total is
not nudged down by eating chicken.

Watch out for `GREATEST`/`LEAST` here: Postgres **skips NULL arguments** rather
than propagating them, so `greatest(NULL, 0)` is `0`, not NULL. Written naively,
every food with a missing macro silently reports a clamped sentinel instead of
"unknown" — the `no negative macros` check in `validate.mjs` exists because that
is exactly what happened the first time.

**The transform runs in SQL.** The CSVs are streamed into unlogged
`usda_stage.*` tables with `COPY`, and every join and aggregation happens from
there. Pulling 27M nutrient rows through Node to group them by food would be the
slow way to do what Postgres does in one pass. The whole staging load is ~30s.

**The rules live in JavaScript; the SQL is generated from them.**
`nutrients.mjs`, `allergens.mjs`, `claims.mjs` and `taxonomy.mjs` hold the
derivation rules as plain data with a tested reference implementation, and
`import.mjs` renders them into the statements that process two million rows.
Restating the rules in SQL by hand is how the fast path and the tested path
drift apart.

**Parallel query is disabled during the import.** Workers exchange tuples
through `/dev/shm`, which Docker caps at 64MB, and a 27M-row aggregation dies
with `could not resize shared memory segment` long before it runs out of real
memory. `infra/docker-compose.yml` now sets `shm_size: 1gb` for the next time
the container is recreated; the import does not depend on it.

## Allergens are inferred, and the column says so

USDA publishes **no structured allergen field** — only the ingredient statement
as printed. Everything extracted from it lands in `allergens_derived`, never in
`allergens`.

That separation is the point. `allergens` answers *"the source declared this"*,
which is what an exclusion filter needs to be trustworthy; `allergens_derived`
answers *"these words appeared in the ingredient list"*, which is enough to warn
someone and **not** enough to clear a food. `allergen_source` records the parser
version so a rule change can re-derive only the rows it owns.

The dangerous failure is a false negative — missing `casein` and showing a food
as clean to a milk-allergic member. So the word lists lean broad, and exclusions
exist only to kill specific collisions (`coconut milk` is not milk, `eggplant` is
not egg). **Exclusions are scoped per allergen**: hiding `peanut butter` from the
milk matcher must not also hide it from the peanut matcher, which is exactly the
bug the first version had.

Core-tier foods have no ingredient text at all, so both columns stay empty for
them.

## Health claims are arithmetic, not advice

`health_claims` holds FDA nutrient-content claims computed from the stored
values — 21 CFR 101.54 for `good_source_of_*` / `excellent_source_of_*`, 101.60
for calories and sugars, 101.62 for fat, saturated fat, cholesterol and sodium.
Nothing is hand-written and nothing is model-generated, so any claim can be
re-derived and checked.

FDA thresholds are **per RACC** (per realistic serving), not per 100 g. Using
100 g would call a breakfast cereal high-sodium and a soft drink low-calorie. So
the labeled serving is used wherever the source gives one, and `claims_basis`
records which of the two a row actually used.

21 CFR 101.14(a)(4) disqualifying levels are enforced: above 13 g fat, 4 g
saturated fat, 60 mg cholesterol or 480 mg sodium per serving, a food gets no
source claims at all. That is what stops butter being advertised as an excellent
source of vitamin A.

These are compositional claims about the food. They are **not** dietary advice
and must not be rendered as a recommendation to a member.

## What is deliberately left empty

`food_classes` and `dietary_tags` stay `{}` on imported rows. The schema derives
`dietary_tags` from `food_classes` precisely so a meal cannot be labelled vegan
while containing butter, and USDA ships neither. Guessing "vegan" from an
ingredient statement is the same class of inference as guessing an allergen, with
the same failure mode — so it is not done here.

`group` is NULL for roughly a third of branded rows. `taxonomy.mjs` maps USDA's
449 branded categories onto the 15-value `group` vocabulary, and NULL is a real
answer: "Frozen Dinners & Entrees" and "Candy" are not vegetables or grains, and
forcing them into one would make the group filter lie. `usda_category` always
keeps USDA's own string, so a wrong guess costs a browse placement and never
destroys the original classification.

## Embeddings

`foods.embedding` is left NULL by this import. Run the existing backfill:

```bash
node packages/db/seed/embed.mjs
```

At ~1.9M branded rows this is a very long job on CPU MiniLM and it builds into an
HNSW index. Embedding the core tier only is the cheap, high-value subset:

```sql
-- core tier only; branded stays searchable by trigram and barcode
SELECT count(*) FROM foods WHERE source='usda' AND usda_data_type <> 'branded_food';
```
