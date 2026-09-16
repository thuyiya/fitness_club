/**
 * The nutrient dictionary for the USDA import.
 *
 * USDA identifies nutrients by a numeric id and a free-text name ("Vitamin C,
 * total ascorbic acid"). Neither is usable as a JSON key, so every nutrient gets
 * a slug that ENDS IN ITS UNIT --- `iron_mg`, `vitamin_d_ug`, `energy_kcal`.
 * That suffix is not decoration: USDA mixes MG, UG, IU and G in one table, and a
 * panel that renders 0.4 µg of vitamin D as 0.4 mg is off by a thousand.
 *
 * CURATED covers the nutrients a member or coach would actually recognise; the
 * remaining ~400 (individual fatty acids, organic acids, isoflavones) fall
 * through to autoSlug so the panel is complete rather than truncated.
 */

/** FDA 2016 adult Daily Values (21 CFR 101.9(c)(8)(iv)), in the nutrient's own unit. */
const DV = {
  protein_g: 50,
  total_fat_g: 78,
  saturated_fat_g: 20,
  cholesterol_mg: 300,
  carbohydrate_g: 275,
  fiber_g: 28,
  added_sugars_g: 50,
  sodium_mg: 2300,
  calcium_mg: 1300,
  iron_mg: 18,
  potassium_mg: 4700,
  magnesium_mg: 420,
  phosphorus_mg: 1250,
  zinc_mg: 11,
  copper_mg: 0.9,
  manganese_mg: 2.3,
  selenium_ug: 55,
  iodine_ug: 150,
  chromium_ug: 35,
  molybdenum_ug: 45,
  vitamin_a_rae_ug: 900,
  vitamin_c_mg: 90,
  vitamin_d_ug: 20,
  vitamin_e_mg: 15,
  vitamin_k_ug: 120,
  thiamin_mg: 1.2,
  riboflavin_mg: 1.3,
  niacin_mg: 16,
  vitamin_b6_mg: 1.7,
  folate_dfe_ug: 400,
  vitamin_b12_ug: 2.4,
  biotin_ug: 30,
  pantothenic_acid_mg: 5,
  choline_mg: 550,
};

/**
 * usda nutrient id -> slug. `macro: true` marks the eight that already have
 * dedicated columns on `foods`; they are still written into `micronutrients`
 * so a rendered panel needs exactly one source, not two.
 */
const CURATED = {
  // --- proximates (these eight also live in their own columns) ---
  1008: { slug: "energy_kcal", macro: true },
  1003: { slug: "protein_g", macro: true },
  1004: { slug: "total_fat_g", macro: true },
  1005: { slug: "carbohydrate_g", macro: true },
  1079: { slug: "fiber_g", macro: true },
  2000: { slug: "total_sugars_g", macro: true },
  1258: { slug: "saturated_fat_g", macro: true },
  1093: { slug: "sodium_mg", macro: true },

  // --- other proximates ---
  1062: { slug: "energy_kj" },
  2047: { slug: "energy_atwater_general_kcal" },
  2048: { slug: "energy_atwater_specific_kcal" },
  1051: { slug: "water_g" },
  1007: { slug: "ash_g" },
  1063: { slug: "sugars_total_g" },
  1235: { slug: "added_sugars_g" },
  1236: { slug: "intrinsic_sugars_g" },
  1009: { slug: "starch_g" },
  1082: { slug: "fiber_soluble_g" },
  1084: { slug: "fiber_insoluble_g" },
  1010: { slug: "sucrose_g" },
  1011: { slug: "glucose_g" },
  1012: { slug: "fructose_g" },
  1013: { slug: "lactose_g" },
  1014: { slug: "maltose_g" },
  1075: { slug: "galactose_g" },
  1018: { slug: "alcohol_g" },
  1057: { slug: "caffeine_mg" },
  1253: { slug: "cholesterol_mg" },
  1257: { slug: "trans_fat_g" },
  1292: { slug: "monounsaturated_fat_g" },
  1293: { slug: "polyunsaturated_fat_g" },
  1272: { slug: "dha_g" },
  1278: { slug: "epa_g" },
  1280: { slug: "dpa_g" },
  1270: { slug: "ala_omega3_g" },
  1269: { slug: "linoleic_acid_g" },

  // --- minerals ---
  1087: { slug: "calcium_mg" },
  1089: { slug: "iron_mg" },
  1090: { slug: "magnesium_mg" },
  1091: { slug: "phosphorus_mg" },
  1092: { slug: "potassium_mg" },
  1095: { slug: "zinc_mg" },
  1098: { slug: "copper_mg" },
  1101: { slug: "manganese_mg" },
  1100: { slug: "iodine_ug" },
  1103: { slug: "selenium_ug" },
  1096: { slug: "chromium_ug" },
  1102: { slug: "molybdenum_ug" },
  1099: { slug: "fluoride_ug" },

  // --- vitamins ---
  1106: { slug: "vitamin_a_rae_ug" },
  1104: { slug: "vitamin_a_iu" },
  1105: { slug: "retinol_ug" },
  1107: { slug: "beta_carotene_ug" },
  1108: { slug: "alpha_carotene_ug" },
  1122: { slug: "lycopene_ug" },
  1123: { slug: "lutein_zeaxanthin_ug" },
  1162: { slug: "vitamin_c_mg" },
  1114: { slug: "vitamin_d_ug" },
  1110: { slug: "vitamin_d_iu" },
  1109: { slug: "vitamin_e_mg" },
  1185: { slug: "vitamin_k_ug" },
  1165: { slug: "thiamin_mg" },
  1166: { slug: "riboflavin_mg" },
  1167: { slug: "niacin_mg" },
  1175: { slug: "vitamin_b6_mg" },
  1178: { slug: "vitamin_b12_ug" },
  1177: { slug: "folate_total_ug" },
  1190: { slug: "folate_dfe_ug" },
  1186: { slug: "folic_acid_ug" },
  1176: { slug: "biotin_ug" },
  1170: { slug: "pantothenic_acid_mg" },
  1180: { slug: "choline_mg" },
};

const UNIT_SUFFIX = {
  G: "g",
  MG: "mg",
  UG: "ug",
  KCAL: "kcal",
  kJ: "kj",
  IU: "iu",
  MG_ATE: "mg_ate",
  MCG_RE: "ug_re",
  "SP GR": "sp_gr",
  PH: "ph",
};

/** Deterministic fallback for the ~400 nutrients CURATED does not name. */
export function autoSlug(name, unit) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  const suffix = UNIT_SUFFIX[unit] ?? unit.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return suffix && !base.endsWith(suffix) ? `${base}_${suffix}` : base;
}

/**
 * Turns parsed nutrient.csv rows into the `nutrients` table payload.
 * Collisions (two USDA nutrients slugging to the same key) are broken by
 * appending the id --- silently dropping one would punch a hole in the panel.
 */
export function buildNutrientRows(csvRows) {
  const seen = new Map();
  const out = [];
  for (const r of csvRows) {
    const usdaId = Number(r.id);
    const curated = CURATED[usdaId];
    let slug = curated?.slug ?? autoSlug(r.name, r.unit_name);
    if (seen.has(slug)) slug = `${slug}_${usdaId}`;
    seen.set(slug, usdaId);
    const rank = Number(r.rank);
    out.push({
      usdaId,
      slug,
      name: r.name,
      unit: r.unit_name,
      // 999999 is USDA's "unranked" sentinel; storing it would sort junk to the
      // end of a panel as though it were a real position.
      rank: Number.isFinite(rank) && rank < 999999 ? rank : null,
      dailyValue: DV[slug] ?? null,
      isMacro: Boolean(curated?.macro),
    });
  }
  return out;
}

export { DV, CURATED };
