#!/usr/bin/env node
/**
 * Imports USDA FoodData Central into `foods`, `food_portions` and `nutrients`.
 *
 *   DATABASE_URL=postgres://... node packages/db/seed/usda/import.mjs \
 *     --source ~/Downloads/FoodData_Central_csv_2026-04-30 [--tiers core,branded]
 *
 * Shape of the job: the CSVs are streamed into unlogged `usda_stage.*` tables
 * with COPY, and every join, aggregation and derivation happens in SQL from
 * there. Pulling 27M nutrient rows through Node to group them by food would be
 * the slow way to do what Postgres does in one pass.
 *
 * Idempotent: rows key on (source='usda', external_id=fdc_id), so a re-run
 * updates in place. Re-running after a parser change is the intended way to
 * re-derive allergens and claims.
 *
 * The derivation rules live in nutrients.mjs / allergens.mjs / claims.mjs /
 * taxonomy.mjs as plain JavaScript data, and the SQL below is GENERATED from
 * those constants rather than restating them --- so the tested reference
 * implementation and the query that processes 2M rows cannot drift apart.
 */
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import postgres from "postgres";

import { buildNutrientRows } from "./nutrients.mjs";
import { ALLERGEN_PATTERNS, excludeRegex, includeRegex, PARSER_VERSION } from "./allergens.mjs";
import {
  ABSOLUTE_CLAIMS, DISQUALIFYING, SOURCE_NUTRIENTS,
  CLAIMS_BASIS_LABEL, CLAIMS_BASIS_100G,
} from "./claims.mjs";
import { DV } from "./nutrients.mjs";
import { resolveGroup } from "./taxonomy.mjs";

const { values: args } = parseArgs({
  options: {
    source: { type: "string" },
    tiers: { type: "string", default: "core,branded" },
    "keep-stage": { type: "boolean", default: false },
    "skip-load": { type: "boolean", default: false },
    /** Comma-separated subset of foods,portions,allergens,claims. */
    steps: { type: "string", default: "foods,portions,allergens,claims" },
  },
});

const SRC = args.source ?? join(process.env.HOME ?? "", "Downloads/FoodData_Central_csv_2026-04-30");

/** core = the tiers with real micronutrient panels; branded = label data only. */
const TIER_TYPES = {
  core: ["foundation_food", "sr_legacy_food", "survey_fndds_food"],
  branded: ["branded_food"],
};
const dataTypes = args.tiers.split(",").map((t) => t.trim()).filter(Boolean)
  .flatMap((t) => TIER_TYPES[t] ?? []);
if (dataTypes.length === 0) throw new Error(`--tiers must name some of: ${Object.keys(TIER_TYPES)}`);

const sql = postgres(
  process.env.DATABASE_URL ?? "postgres://wellness:localdev_only_not_a_real_secret@localhost:5432/wellness",
  { max: 2, onnotice: () => {}, idle_timeout: 0, connect_timeout: 60 },
);

const t0 = Date.now();
const step = (msg) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(5)}s] ${msg}`);

/** Every staged column is text: cast on read, so a stray value fails the
 *  transform with a visible row rather than aborting a 1.8GB COPY at 90%. */
const STAGE = {
  food: ["fdc_id", "data_type", "description", "food_category_id", "publication_date"],
  food_nutrient: ["id", "fdc_id", "nutrient_id", "amount", "data_points", "derivation_id", "min", "max",
    "median", "loq", "footnote", "min_year_acquired", "percent_daily_value"],
  nutrient: ["id", "name", "unit_name", "nutrient_nbr", "rank"],
  food_category: ["id", "code", "description"],
  measure_unit: ["id", "name"],
  food_portion: ["id", "fdc_id", "seq_num", "amount", "measure_unit_id", "portion_description",
    "modifier", "gram_weight", "data_points", "footnote", "min_year_acquired"],
  branded_food: ["fdc_id", "brand_owner", "brand_name", "subbrand_name", "gtin_upc", "ingredients",
    "not_a_significant_source_of", "serving_size", "serving_size_unit", "household_serving_fulltext",
    "branded_food_category", "data_source", "package_weight", "modified_date", "available_date",
    "market_country", "discontinued_date", "preparation_state_code", "trade_channel",
    "short_description", "material_code"],
};

async function loadStage() {
  await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS usda_stage`);
  for (const [table, cols] of Object.entries(STAGE)) {
    // UNLOGGED: staging survives nothing but the run, and skipping WAL is the
    // difference between minutes and an hour on the 1.8GB nutrient file.
    await sql.unsafe(`DROP TABLE IF EXISTS usda_stage.${table}`);
    await sql.unsafe(
      `CREATE UNLOGGED TABLE usda_stage.${table} (${cols.map((c) => `"${c}" text`).join(", ")})`,
    );
    const path = join(SRC, `${table}.csv`);
    step(`COPY ${table}.csv`);
    const writable = await sql`COPY ${sql.unsafe(`usda_stage.${table}`)} FROM STDIN (FORMAT csv, HEADER true)`.writable();
    await pipeline(createReadStream(path), writable);
    const [{ count }] = await sql.unsafe(`SELECT count(*)::bigint AS count FROM usda_stage.${table}`);
    step(`  ${table}: ${Number(count).toLocaleString()} rows`);
  }
  step("indexing stage");
  await sql.unsafe(`CREATE INDEX ON usda_stage.food_nutrient (fdc_id)`);
  await sql.unsafe(`CREATE INDEX ON usda_stage.food (fdc_id)`);
  await sql.unsafe(`CREATE INDEX ON usda_stage.branded_food (fdc_id)`);
  await sql.unsafe(`CREATE INDEX ON usda_stage.food_portion (fdc_id)`);
  await sql.unsafe(`ANALYZE usda_stage.food_nutrient`);
}

/** The nutrient dictionary --- must exist before the jsonb panel can be keyed. */
async function seedNutrients() {
  const csv = await sql.unsafe(`SELECT id, name, unit_name, rank FROM usda_stage.nutrient`);
  // postgres.js takes the object's OWN keys as column names, so the payload is
  // built snake_case rather than relying on a camel transform this client is
  // not configured with.
  const rows = buildNutrientRows(csv).map((n) => ({
    usda_id: n.usdaId, slug: n.slug, name: n.name, unit: n.unit,
    rank: n.rank, daily_value: n.dailyValue, is_macro: n.isMacro,
  }));
  await sql`INSERT INTO nutrients ${sql(rows, "usda_id", "slug", "name", "unit", "rank", "daily_value", "is_macro")}
            ON CONFLICT (usda_id) DO UPDATE SET
              slug = EXCLUDED.slug, name = EXCLUDED.name, unit = EXCLUDED.unit,
              rank = EXCLUDED.rank, daily_value = EXCLUDED.daily_value, is_macro = EXCLUDED.is_macro`;
  step(`nutrients: ${rows.length} dictionary entries`);
}

/**
 * The category -> group map, computed in JS so taxonomy.mjs stays the only
 * place the mapping is defined, then shipped to the server as a lookup table.
 */
async function seedGroupMap() {
  // Two cheap scans rather than one DISTINCT over a 2.1M x 2M join: branded
  // categories only ever come from branded_food, and every other tier only ever
  // from the 28-row food_category table.
  const cats = await sql.unsafe(`
    SELECT 'branded_food' AS data_type, btrim(branded_food_category) AS usda_category
    FROM usda_stage.branded_food
    WHERE btrim(branded_food_category) <> ''
    GROUP BY 2
    UNION ALL
    SELECT dt.data_type, fc.description
    FROM usda_stage.food_category fc
    CROSS JOIN (SELECT DISTINCT data_type FROM usda_stage.food WHERE data_type <> 'branded_food') dt`);
  const rows = cats.map((c) => ({
    data_type: c.data_type,
    usda_category: c.usda_category,
    group: resolveGroup(c.usda_category, null, c.data_type),
  }));
  await sql.unsafe(`DROP TABLE IF EXISTS usda_stage.group_map`);
  await sql.unsafe(`CREATE UNLOGGED TABLE usda_stage.group_map (data_type text, usda_category text, "group" text)`);
  for (let i = 0; i < rows.length; i += 1000) {
    await sql`INSERT INTO usda_stage.group_map ${sql(rows.slice(i, i + 1000), "data_type", "usda_category", "group")}`;
  }
  await sql.unsafe(`CREATE INDEX ON usda_stage.group_map (data_type, usda_category)`);
  const mapped = rows.filter((r) => r.group).length;
  step(`group map: ${mapped}/${rows.length} categories mapped to a group`);
}


/**
 * USDA reports every amount per 100 g --- including for liquids, where it is
 * per 100 g of product and not per 100 ml. Storing `serving_unit = 'ml'` for
 * drinks, the way the curated catalog does, would silently apply a density of
 * 1.0 to everything from oil to syrup, so USDA rows are stored as grams and the
 * household measures in `food_portions` carry the volume instead.
 */
const SERVING_UNIT = "g";

/**
 * numeric(8,2) tops out at 999999.99; a bad source value must not abort a batch.
 *
 * The CASE is load-bearing. Postgres GREATEST/LEAST SKIP null arguments rather
 * than propagating them, so `greatest(NULL, -999999.99)` is -999999.99, not
 * NULL --- which silently turned every food with a missing macro into one
 * reporting minus a million calories. Guard the null explicitly.
 */
const clamp = (expr) =>
  `(CASE WHEN ${expr} IS NULL THEN NULL ELSE least(greatest(${expr}, -999999.99), 999999.99) END)`;

/**
 * Same, floored at zero, for the eight macro columns.
 *
 * USDA computes "carbohydrate, by difference" as 100 minus water, protein, fat
 * and ash, which lands a few hundredths BELOW zero on zero-carb foods --- raw
 * chicken breast is -0.43 g. That is real source data and stays verbatim in
 * `micronutrients`, but a member's daily total must not be nudged down by
 * eating chicken, so the app-facing column is floored. The panel keeps the
 * truth; the column keeps the arithmetic sane.
 */
const clampMacro = (expr) =>
  `(CASE WHEN ${expr} IS NULL THEN NULL ELSE least(greatest(${expr}, 0), 999999.99) END)`;
const mn = (slug) => `nullif(panel.mn->>'${slug}','')::numeric`;

const INSERT_FOODS = (lo, hi) => `
WITH scoped AS (
  SELECT f.fdc_id, f.data_type, f.description, f.publication_date, f.food_category_id
  FROM usda_stage.food f
  WHERE f.data_type = ANY($1) AND f.fdc_id::int >= ${lo} AND f.fdc_id::int < ${hi}
),
panel AS (
  SELECT fn.fdc_id, jsonb_object_agg(n.slug, round(fn.amount::numeric, 4)) AS mn
  FROM usda_stage.food_nutrient fn
  JOIN scoped s ON s.fdc_id = fn.fdc_id
  JOIN nutrients n ON n.usda_id = fn.nutrient_id::int
  WHERE fn.amount <> '' AND fn.amount IS NOT NULL
  GROUP BY fn.fdc_id
)
INSERT INTO foods (
  source, external_id, slug, name, brand, "group", usda_data_type, usda_category,
  barcode, ingredients_text, source_published_at, serving_size, serving_unit,
  calories, protein_g, carbs_g, fat_g, saturated_fat_g, fiber_g, sugar_g, sodium_mg,
  micronutrients, is_verified
)
SELECT
  'usda',
  s.fdc_id,
  'usda-' || s.fdc_id,
  btrim(s.description),
  nullif(btrim(coalesce(nullif(bf.brand_name, ''), bf.brand_owner, '')), ''),
  -- The eggs override from taxonomy.mjs: "Dairy and Egg Products" is two groups,
  -- and only the description separates them.
  CASE WHEN gm."group" = 'dairy' AND s.description ~* '^eggs?[, ]|^egg,|egg substitute'
       THEN 'eggs' ELSE gm."group" END,
  s.data_type,
  coalesce(bf.branded_food_category, fc.description),
  nullif(btrim(bf.gtin_upc), ''),
  nullif(btrim(bf.ingredients), ''),
  nullif(s.publication_date, '')::date,
  100, '${SERVING_UNIT}',
  coalesce(${clampMacro(mn("energy_kcal"))}, ${clampMacro(mn("energy_atwater_general_kcal"))}, 0),
  coalesce(${clampMacro(mn("protein_g"))}, 0),
  coalesce(${clampMacro(mn("carbohydrate_g"))}, ${clampMacro(mn("carbohydrate_by_summation_g"))}, 0),
  coalesce(${clampMacro(mn("total_fat_g"))}, 0),
  ${clampMacro(mn("saturated_fat_g"))},
  coalesce(${clampMacro(mn("fiber_g"))}, ${clampMacro(mn("total_dietary_fiber_aoac_2011_25_g"))}),
  coalesce(${clampMacro(mn("total_sugars_g"))}, ${clampMacro(mn("sugars_total_g"))}),
  ${clampMacro(mn("sodium_mg"))},
  panel.mn,
  s.data_type <> 'branded_food'
FROM scoped s
LEFT JOIN panel ON panel.fdc_id = s.fdc_id
LEFT JOIN usda_stage.branded_food bf ON bf.fdc_id = s.fdc_id
LEFT JOIN usda_stage.food_category fc ON fc.id = s.food_category_id
LEFT JOIN usda_stage.group_map gm
       ON gm.data_type = s.data_type
      AND gm.usda_category = coalesce(bf.branded_food_category, fc.description)
-- A food with no nutrient rows at all is a catalog stub, not a food: it would
-- log as 0 kcal and quietly corrupt a member's day.
WHERE panel.mn IS NOT NULL
ON CONFLICT (source, external_id) DO UPDATE SET
  name = EXCLUDED.name, brand = EXCLUDED.brand, "group" = EXCLUDED."group",
  usda_data_type = EXCLUDED.usda_data_type, usda_category = EXCLUDED.usda_category,
  barcode = EXCLUDED.barcode, ingredients_text = EXCLUDED.ingredients_text,
  source_published_at = EXCLUDED.source_published_at,
  calories = EXCLUDED.calories, protein_g = EXCLUDED.protein_g, carbs_g = EXCLUDED.carbs_g,
  fat_g = EXCLUDED.fat_g, saturated_fat_g = EXCLUDED.saturated_fat_g,
  fiber_g = EXCLUDED.fiber_g, sugar_g = EXCLUDED.sugar_g, sodium_mg = EXCLUDED.sodium_mg,
  micronutrients = EXCLUDED.micronutrients, is_verified = EXCLUDED.is_verified`;

/** Chunked by fdc_id so one 2M-row aggregation does not have to fit in work_mem. */
async function transformFoods() {
  const [{ lo, hi }] = await sql.unsafe(
    `SELECT min(fdc_id::int) AS lo, max(fdc_id::int) AS hi FROM usda_stage.food WHERE data_type = ANY($1)`,
    [dataTypes],
  );
  const CHUNK = 100_000;
  let total = 0;
  for (let start = Number(lo); start <= Number(hi); start += CHUNK) {
    const res = await sql.unsafe(INSERT_FOODS(start, start + CHUNK), [dataTypes]);
    total += res.count ?? 0;
    if (res.count) step(`  foods ${start}-${start + CHUNK}: +${res.count} (total ${total.toLocaleString()})`);
  }
  step(`foods: ${total.toLocaleString()} rows upserted`);
}

/**
 * Household measures. Two sources: `food_portion` for core foods ("1 cup,
 * chopped" -> 150 g), and the branded label serving, which is the one every
 * health claim is tested against and so is flagged.
 */
async function transformPortions() {
  step("portions: core food_portion rows");
  const core = await sql.unsafe(`
    INSERT INTO food_portions (food_id, seq_num, amount, unit, description, modifier, gram_weight, is_label_serving)
    SELECT fo.id,
           coalesce(nullif(p.seq_num, '')::int, 0),
           nullif(p.amount, '')::numeric,
           nullif(mu.name, 'undetermined'),
           nullif(btrim(p.portion_description), ''),
           nullif(btrim(p.modifier), ''),
           p.gram_weight::numeric,
           false
    FROM usda_stage.food_portion p
    JOIN foods fo ON fo.source = 'usda' AND fo.external_id = p.fdc_id
    LEFT JOIN usda_stage.measure_unit mu ON mu.id = p.measure_unit_id
    WHERE p.gram_weight <> '' AND p.gram_weight::numeric > 0
    ON CONFLICT (food_id, seq_num, gram_weight) DO NOTHING`);
  step(`  core portions: ${core.count}`);

  step("portions: branded label servings");
  // seq_num 0 is reserved for the label serving so it sorts first and so the
  // unique index keeps a re-run from stacking duplicates.
  const branded = await sql.unsafe(`
    INSERT INTO food_portions (food_id, seq_num, amount, unit, description, modifier, gram_weight, is_label_serving)
    SELECT fo.id, 0,
           bf.serving_size::numeric,
           lower(nullif(btrim(bf.serving_size_unit), '')),
           nullif(btrim(bf.household_serving_fulltext), ''),
           NULL,
           bf.serving_size::numeric,
           true
    FROM usda_stage.branded_food bf
    JOIN foods fo ON fo.source = 'usda' AND fo.external_id = bf.fdc_id
    WHERE bf.serving_size <> ''
      AND bf.serving_size::numeric > 0
      AND bf.serving_size::numeric <= 1000
      -- ml is stored at a density of 1.0. True for water and near enough for
      -- most drinks; it is why the unit column keeps the declared unit for display.
      AND lower(btrim(bf.serving_size_unit)) IN ('g', 'grm', 'ml', 'mlt')
    ON CONFLICT (food_id, seq_num, gram_weight) DO NOTHING`);
  step(`  branded label servings: ${branded.count}`);
}

/**
 * Allergen derivation, as one generated UPDATE.
 *
 * The regexes come straight out of allergens.mjs, so this pass and the tested
 * deriveAllergens() reference implementation are the same rules --- the only
 * difference is that one runs over a unit-test fixture and the other over two
 * million rows. Written explicitly against POSIX-compatible constructs so the
 * two engines agree.
 */
function buildAllergenSql(lo, hi) {
  const branches = Object.keys(ALLERGEN_PATTERNS).map((allergen) => {
    const ex = excludeRegex(allergen);
    const text = ex
      ? `regexp_replace(lower(ingredients_text), '${ex.replace(/'/g, "''")}', ' ', 'g')`
      : `lower(ingredients_text)`;
    return `CASE WHEN ${text} ~ '${includeRegex(allergen).replace(/'/g, "''")}' THEN '${allergen}' END`;
  });
  return `
    UPDATE foods SET
      allergens_derived = array_remove(ARRAY[${branches.join(",\n      ")}], NULL),
      allergen_source = '${PARSER_VERSION}'
    WHERE source = 'usda'
      AND ingredients_text IS NOT NULL
      AND external_id::int >= ${lo} AND external_id::int < ${hi}`;
}

/**
 * FDA claims, as one generated UPDATE, built from the same ABSOLUTE_CLAIMS /
 * DISQUALIFYING / SOURCE_NUTRIENTS tables that claims.mjs tests against.
 *
 * `factor` rescales the stored per-100 g panel to the labeled serving, because
 * FDA thresholds are per RACC. Where no usable label serving exists the pass
 * falls back to 100 g and says so in `claims_basis` --- a claim whose basis is
 * unknown is worse than no claim.
 */
function buildClaimsSql(lo, hi) {
  const v = (slug) => `(nullif(f.micronutrients->>'${slug}','')::numeric * ls.factor)`;

  const absolute = ABSOLUTE_CLAIMS.map(
    (r) => `CASE WHEN ${v(r.nutrient)} ${r.exclusive ? "<" : "<="} ${r.max} THEN '${r.claim}' END`,
  );

  const disqualified = Object.entries(DISQUALIFYING)
    .map(([slug, limit]) => `coalesce(${v(slug)} > ${limit}, false)`)
    .join(" OR ");

  const source = Object.entries(SOURCE_NUTRIENTS)
    .filter(([slug]) => DV[slug])
    .map(([slug, word]) => {
      const pct = `(${v(slug)} / ${DV[slug]} * 100)`;
      return `CASE WHEN NOT (${disqualified}) AND ${v(slug)} > 0 THEN
        CASE WHEN ${pct} >= 20 THEN 'excellent_source_of_${word}'
             WHEN ${pct} >= 10 THEN 'good_source_of_${word}' END END`;
    });

  return `
    WITH ls AS (
      SELECT fo.id AS food_id,
             CASE WHEN p.gram_weight > 0 AND p.gram_weight <= 1000
                  THEN p.gram_weight / 100.0 ELSE 1.0 END AS factor,
             (p.gram_weight > 0 AND p.gram_weight <= 1000) AS has_label
      FROM foods fo
      LEFT JOIN LATERAL (
        SELECT gram_weight FROM food_portions
        WHERE food_id = fo.id AND is_label_serving ORDER BY gram_weight LIMIT 1
      ) p ON true
      WHERE fo.source = 'usda' AND fo.external_id::int >= ${lo} AND fo.external_id::int < ${hi}
    )
    UPDATE foods f SET
      health_claims = (
        SELECT coalesce(array_agg(c ORDER BY c), '{}')
        FROM unnest(array_remove(ARRAY[
          ${[...absolute, ...source].join(",\n          ")}
        ], NULL)) AS c
      ),
      claims_basis = CASE WHEN coalesce(ls.has_label, false)
                          THEN '${CLAIMS_BASIS_LABEL.replace(/'/g, "''")}'
                          ELSE '${CLAIMS_BASIS_100G.replace(/'/g, "''")}' END
    FROM ls
    WHERE ls.food_id = f.id AND f.micronutrients IS NOT NULL`;
}

/** Both derivations are chunked so no single statement locks 2M rows at once. */
async function derive(label, build) {
  const [{ lo, hi }] = await sql.unsafe(
    `SELECT min(external_id::int) AS lo, max(external_id::int) AS hi FROM foods WHERE source = 'usda'`,
  );
  if (lo === null) return step(`${label}: nothing to do`);
  const CHUNK = 100_000;
  let total = 0;
  for (let start = Number(lo); start <= Number(hi); start += CHUNK) {
    const res = await sql.unsafe(build(start, start + CHUNK));
    total += res.count ?? 0;
  }
  step(`${label}: ${total.toLocaleString()} rows updated`);
}

async function main() {
  // Bulk aggregation over 27M nutrient rows; the default 4MB work_mem would
  // spill every jsonb_object_agg to disk.
  await sql.unsafe(`SET work_mem = '512MB'`);
  await sql.unsafe(`SET maintenance_work_mem = '1GB'`);
  await sql.unsafe(`SET synchronous_commit = off`);
  // Parallel workers exchange tuples through /dev/shm, which Docker sizes at
  // 64MB unless told otherwise (see infra/docker-compose.yml). Rather than
  // depend on the container being recreated with the larger segment, the import
  // runs single-threaded --- the work is already chunked, so the cost is small
  // and the failure mode it avoids is the whole run dying mid-aggregation.
  await sql.unsafe(`SET max_parallel_workers_per_gather = 0`);

  step(`source: ${SRC}`);
  step(`tiers: ${dataTypes.join(", ")}`);

  const steps = new Set(args.steps.split(",").map((t) => t.trim()).filter(Boolean));
  step(`steps: ${[...steps].join(", ")}`);

  if (!args["skip-load"]) await loadStage();
  await seedNutrients();
  await seedGroupMap();
  if (steps.has("foods")) await transformFoods();
  if (steps.has("portions")) await transformPortions();
  if (steps.has("allergens")) await derive("allergens", buildAllergenSql);
  if (steps.has("claims")) await derive("health claims", buildClaimsSql);

  if (!args["keep-stage"]) {
    step("dropping stage");
    await sql.unsafe(`DROP SCHEMA usda_stage CASCADE`);
  }

  const [summary] = await sql.unsafe(`
    SELECT count(*) AS foods,
           count(*) FILTER (WHERE micronutrients IS NOT NULL) AS with_panel,
           count(*) FILTER (WHERE array_length(allergens_derived, 1) > 0) AS with_allergens,
           count(*) FILTER (WHERE array_length(health_claims, 1) > 0) AS with_claims
    FROM foods WHERE source = 'usda'`);
  step(`done: ${JSON.stringify(summary)}`);
}

// Guarded so the generated SQL can be imported and inspected without running
// a two-million-row import as a side effect of `import`.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => sql.end());
}

export { buildAllergenSql, buildClaimsSql, INSERT_FOODS };
