/**
 * FDA nutrient-content claims, computed from the numbers.
 *
 * Every claim here is arithmetic against a published threshold --- 21 CFR 101.54
 * for "good source"/"high", 101.60 for calories and sugars, 101.62 for fat,
 * saturated fat, cholesterol and sodium. Nothing is hand-written and nothing is
 * model-generated, so a claim can always be re-derived from the stored nutrients
 * and checked.
 *
 * BASIS. FDA thresholds are per RACC (Reference Amount Customarily Consumed) ---
 * per realistic serving, not per 100 g. Using 100 g instead would call a
 * breakfast cereal "high sodium" and a soft drink "low calorie", because 100 g of
 * one is two servings and 100 ml of the other is a third of a can. So the label
 * serving is used whenever the source gives one, and `claimsBasis` records which
 * of the two a row actually used --- a claim whose basis is unknown is worse than
 * no claim.
 */

import { DV } from "./nutrients.mjs";

export const CLAIMS_BASIS_LABEL = "FDA 21 CFR 101.54/101.60/101.62, per labeled serving";
export const CLAIMS_BASIS_100G = "FDA 21 CFR 101.54/101.60/101.62, per 100 g (no labeled serving)";

/**
 * Disqualifying levels, 21 CFR 101.14(a)(4): above any of these per RACC a food
 * may not carry a "good source"/"high" claim at all. This is what stops butter
 * being advertised as an excellent source of vitamin A.
 */
export const DISQUALIFYING = {
  total_fat_g: 13,
  saturated_fat_g: 4,
  cholesterol_mg: 60,
  sodium_mg: 480,
};

/** Absolute thresholds, per RACC. `max` is inclusive unless `exclusive`. */
export const ABSOLUTE_CLAIMS = [
  { claim: "calorie_free", nutrient: "energy_kcal", max: 5, exclusive: true },
  { claim: "low_calorie", nutrient: "energy_kcal", max: 40 },
  { claim: "fat_free", nutrient: "total_fat_g", max: 0.5, exclusive: true },
  { claim: "low_fat", nutrient: "total_fat_g", max: 3 },
  { claim: "saturated_fat_free", nutrient: "saturated_fat_g", max: 0.5, exclusive: true },
  { claim: "low_saturated_fat", nutrient: "saturated_fat_g", max: 1 },
  { claim: "cholesterol_free", nutrient: "cholesterol_mg", max: 2, exclusive: true },
  { claim: "low_cholesterol", nutrient: "cholesterol_mg", max: 20 },
  { claim: "sodium_free", nutrient: "sodium_mg", max: 5, exclusive: true },
  { claim: "very_low_sodium", nutrient: "sodium_mg", max: 35 },
  { claim: "low_sodium", nutrient: "sodium_mg", max: 140 },
  { claim: "sugar_free", nutrient: "total_sugars_g", max: 0.5, exclusive: true },
];

/**
 * Nutrients eligible for a source claim, slug -> the word used in the claim id.
 * Deliberately excludes sodium, saturated fat and cholesterol: "excellent source
 * of sodium" is not a thing anyone wants to read.
 */
export const SOURCE_NUTRIENTS = {
  protein_g: "protein",
  fiber_g: "fiber",
  calcium_mg: "calcium",
  iron_mg: "iron",
  potassium_mg: "potassium",
  magnesium_mg: "magnesium",
  phosphorus_mg: "phosphorus",
  zinc_mg: "zinc",
  copper_mg: "copper",
  manganese_mg: "manganese",
  selenium_ug: "selenium",
  iodine_ug: "iodine",
  chromium_ug: "chromium",
  molybdenum_ug: "molybdenum",
  vitamin_a_rae_ug: "vitamin_a",
  vitamin_c_mg: "vitamin_c",
  vitamin_d_ug: "vitamin_d",
  vitamin_e_mg: "vitamin_e",
  vitamin_k_ug: "vitamin_k",
  thiamin_mg: "thiamin",
  riboflavin_mg: "riboflavin",
  niacin_mg: "niacin",
  vitamin_b6_mg: "vitamin_b6",
  folate_dfe_ug: "folate",
  vitamin_b12_ug: "vitamin_b12",
  biotin_ug: "biotin",
  pantothenic_acid_mg: "pantothenic_acid",
  choline_mg: "choline",
};

/**
 * @param per100g  { slug: amount } as stored in foods.micronutrients
 * @param servingGrams  label serving in grams, or null to fall back to 100 g
 */
export function computeClaims(per100g, servingGrams) {
  if (!per100g) return { claims: [], basis: null };
  // A "serving" of 0 g, or an implausible one, would scale every threshold into
  // nonsense --- fall back rather than emit a claim nobody can reproduce.
  const usable = servingGrams && servingGrams > 0 && servingGrams <= 1000 ? servingGrams : null;
  const factor = (usable ?? 100) / 100;
  const at = (slug) => {
    const v = per100g[slug];
    return typeof v === "number" && Number.isFinite(v) ? v * factor : null;
  };

  const claims = [];
  for (const rule of ABSOLUTE_CLAIMS) {
    const v = at(rule.nutrient);
    if (v === null) continue;
    if (rule.exclusive ? v < rule.max : v <= rule.max) claims.push(rule.claim);
  }

  // Disqualifying levels gate only the source claims, not the "low X" claims
  // above --- a food can be genuinely low in sodium and still too fatty to be
  // promoted as a source of anything.
  const disqualified = Object.entries(DISQUALIFYING).some(([slug, limit]) => {
    const v = at(slug);
    return v !== null && v > limit;
  });

  if (!disqualified) {
    for (const [slug, word] of Object.entries(SOURCE_NUTRIENTS)) {
      const dv = DV[slug];
      const v = at(slug);
      if (!dv || v === null || v <= 0) continue;
      const pct = (v / dv) * 100;
      if (pct >= 20) claims.push(`excellent_source_of_${word}`);
      else if (pct >= 10) claims.push(`good_source_of_${word}`);
    }
  }

  return {
    claims: claims.sort(),
    basis: usable ? CLAIMS_BASIS_LABEL : CLAIMS_BASIS_100G,
  };
}
