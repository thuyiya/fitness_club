#!/usr/bin/env node
/**
 * Post-import checks for the USDA rows.
 *
 *   DATABASE_URL=postgres://... node packages/db/seed/usda/validate.mjs
 *
 * The check that matters most is PARITY: the allergen and claim columns were
 * written by SQL that import.mjs generates from allergens.mjs / claims.mjs, so
 * this re-runs the tested JavaScript reference implementations over a random
 * sample and compares. A mismatch means the fast path and the tested path have
 * drifted, which is the one failure the unit tests cannot see.
 */
import postgres from "postgres";
import { deriveAllergens } from "./allergens.mjs";
import { computeClaims } from "./claims.mjs";

const sql = postgres(
  process.env.DATABASE_URL ?? "postgres://wellness:localdev_only_not_a_real_secret@localhost:5432/wellness",
  { max: 2, onnotice: () => {} },
);

const SAMPLE = Number(process.env.SAMPLE ?? 2000);
let failures = 0;
const check = (name, ok, detail = "") => {
  if (ok) return console.log(`  ok    ${name}`);
  failures++;
  console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ""}`);
};

const one = async (query) => (await sql.unsafe(query))[0];

console.log("\nintegrity");

// The authoritative allergen column must stay untouched by an inferring import.
// If this ever fails, every "exclude peanuts" filter in the app silently became
// a guess.
const bleed = await one(`SELECT count(*) AS n FROM foods WHERE source='usda' AND array_length(allergens,1) > 0`);
check("allergens (source-declared) left empty for usda rows", Number(bleed.n) === 0, `${bleed.n} rows carry inferred data in the trusted column`);

const orphanSrc = await one(`
  SELECT count(*) AS n FROM foods
  WHERE source='usda' AND array_length(allergens_derived,1) > 0 AND allergen_source IS NULL`);
check("every derived allergen records its parser version", Number(orphanSrc.n) === 0, `${orphanSrc.n} rows`);

const orphanBasis = await one(`
  SELECT count(*) AS n FROM foods
  WHERE source='usda' AND array_length(health_claims,1) > 0 AND claims_basis IS NULL`);
check("every claim records the rule set it came from", Number(orphanBasis.n) === 0, `${orphanBasis.n} rows`);

const badServing = await one(`
  SELECT count(*) AS n FROM foods
  WHERE source='usda' AND (serving_size <> 100 OR serving_unit <> 'g')`);
check("all usda rows are per 100 g", Number(badServing.n) === 0, `${badServing.n} rows`);

const unknownKeys = await one(`
  SELECT count(*) AS n FROM (
    SELECT DISTINCT k FROM foods f, jsonb_object_keys(f.micronutrients) k
    WHERE f.source='usda' AND f.micronutrients IS NOT NULL
  ) s LEFT JOIN nutrients n ON n.slug = s.k WHERE n.slug IS NULL`);
check("every micronutrient key exists in the nutrient dictionary", Number(unknownKeys.n) === 0, `${unknownKeys.n} unknown keys`);

const negative = await one(`
  SELECT count(*) AS n FROM foods
  WHERE source='usda' AND (calories < 0 OR protein_g < 0 OR carbs_g < 0 OR fat_g < 0)`);
check("no negative macros", Number(negative.n) === 0, `${negative.n} rows`);

// The macro columns are a denormalised copy of the panel; a mismatch means one
// of the two is lying and a logged meal will not add up.
const drift = await one(`
  SELECT count(*) AS n FROM foods
  WHERE source='usda' AND micronutrients ? 'protein_g'
    AND abs(protein_g - (micronutrients->>'protein_g')::numeric) > 0.01`);
check("protein column agrees with the panel", Number(drift.n) === 0, `${drift.n} rows drift`);

const noPanel = await one(`SELECT count(*) AS n FROM foods WHERE source='usda' AND micronutrients IS NULL`);
check("no usda row was imported without nutrients", Number(noPanel.n) === 0, `${noPanel.n} rows`);

console.log(`\nparity (random sample of ${SAMPLE})`);

const rows = await sql.unsafe(`
  SELECT f.id, f.name, f.ingredients_text, f.allergens_derived, f.health_claims, f.micronutrients,
         (SELECT p.gram_weight FROM food_portions p
           WHERE p.food_id = f.id AND p.is_label_serving
           ORDER BY p.gram_weight LIMIT 1) AS label_grams
  FROM foods f
  WHERE f.source='usda' AND f.micronutrients IS NOT NULL
  ORDER BY random() LIMIT ${SAMPLE}`);

let allergenMismatch = [];
let claimMismatch = [];
for (const r of rows) {
  const expected = deriveAllergens(r.ingredients_text);
  const actual = [...(r.allergens_derived ?? [])].sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    allergenMismatch.push({ name: r.name, expected, actual, text: (r.ingredients_text ?? "").slice(0, 90) });
  }

  const panel = Object.fromEntries(
    Object.entries(r.micronutrients).map(([k, v]) => [k, Number(v)]),
  );
  const { claims } = computeClaims(panel, r.label_grams === null ? null : Number(r.label_grams));
  const actualClaims = [...(r.health_claims ?? [])].sort();
  if (JSON.stringify(claims) !== JSON.stringify(actualClaims)) {
    const missing = claims.filter((c) => !actualClaims.includes(c));
    const extra = actualClaims.filter((c) => !claims.includes(c));
    claimMismatch.push({ name: r.name, missing, extra });
  }
}

check(
  `allergen SQL matches deriveAllergens() (${rows.length - allergenMismatch.length}/${rows.length})`,
  allergenMismatch.length === 0,
  allergenMismatch.slice(0, 5).map((m) => `${m.name}: sql=${JSON.stringify(m.actual)} js=${JSON.stringify(m.expected)} | ${m.text}`).join("\n          "),
);
check(
  `claims SQL matches computeClaims() (${rows.length - claimMismatch.length}/${rows.length})`,
  claimMismatch.length === 0,
  claimMismatch.slice(0, 5).map((m) => `${m.name}: missing=${JSON.stringify(m.missing)} extra=${JSON.stringify(m.extra)}`).join("\n          "),
);

console.log("\ncoverage");
const cov = await one(`
  SELECT count(*) AS total,
         count(*) FILTER (WHERE usda_data_type <> 'branded_food') AS core,
         count(*) FILTER (WHERE usda_data_type = 'branded_food') AS branded,
         count(*) FILTER (WHERE "group" IS NOT NULL) AS grouped,
         count(*) FILTER (WHERE array_length(allergens_derived,1) > 0) AS with_allergens,
         count(*) FILTER (WHERE array_length(health_claims,1) > 0) AS with_claims,
         count(*) FILTER (WHERE barcode IS NOT NULL) AS with_barcode,
         round(avg((SELECT count(*) FROM jsonb_object_keys(micronutrients)))) AS avg_panel
  FROM foods WHERE source='usda'`);
for (const [k, v] of Object.entries(cov)) console.log(`  ${k.padEnd(16)} ${Number(v).toLocaleString()}`);

const portions = await one(`SELECT count(*) AS n, count(*) FILTER (WHERE is_label_serving) AS label FROM food_portions`);
console.log(`  portions         ${Number(portions.n).toLocaleString()} (${Number(portions.label).toLocaleString()} label servings)`);

console.log(failures === 0 ? "\nall checks passed\n" : `\n${failures} check(s) failed\n`);
process.exitCode = failures === 0 ? 0 : 1;
await sql.end();
