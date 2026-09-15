import { client } from "../db.js";

export interface MacroTarget {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealMatchOptions {
  excludeAllergens?: string[];
  requireTags?: string[];
  mealType?: string | null;
  /** How far the portion may be scaled. 1x means "serve it as written". */
  minServings?: number;
  maxServings?: number;
  limit?: number;
}

/**
 * Finds meals that hit a macro target.
 *
 * Two things make this work where a naive implementation fails:
 *
 * 1. It matches on macro RATIO, then scales the portion. A 600 kcal meal at
 *    0.75x hits a 450 kcal target; matching absolute macros throws away most
 *    of the catalog for no reason.
 * 2. Allergen exclusion is a hard predicate on a GIN index, evaluated before
 *    ranking. It is never a similarity score, because "probably no peanuts"
 *    is not an acceptable answer.
 */
export async function matchMeals(target: MacroTarget, opts: MealMatchOptions = {}) {
  const {
    excludeAllergens = [],
    requireTags = [],
    mealType = null,
    minServings = 0.5,
    maxServings = 2,
    limit = 10,
  } = opts;

  return client`
    WITH scaled AS (
      SELECT
        m.id, m.slug, m.name, m.default_meal_type, m.tags, m.allergens, m.photo_url, m.prep_minutes,
        ${target.calories}::numeric / NULLIF(m.calories, 0) AS servings,
        m.protein_g * ${target.calories}::numeric / NULLIF(m.calories, 0) AS protein_g,
        m.carbs_g   * ${target.calories}::numeric / NULLIF(m.calories, 0) AS carbs_g,
        m.fat_g     * ${target.calories}::numeric / NULLIF(m.calories, 0) AS fat_g
      FROM meals m
      WHERE m.calories > 0
        AND NOT (m.allergens && ${excludeAllergens}::text[])
        ${requireTags.length ? client`AND m.tags @> ${requireTags}::text[]` : client``}
        ${mealType ? client`AND m.default_meal_type = ${mealType}::meal_type` : client``}
    )
    SELECT
      id, slug, name, default_meal_type AS "mealType", tags, allergens,
      photo_url AS "photoUrl", prep_minutes AS "prepMinutes",
      round(servings, 2) AS servings,
      round(protein_g, 1) AS "proteinG",
      round(carbs_g, 1) AS "carbsG",
      round(fat_g, 1) AS "fatG",
      -- Absolute gram error across the three macros; lower is better. Protein
      -- is weighted double because missing it is what actually costs results.
      round(
        2 * abs(protein_g - ${target.proteinG}) +
            abs(carbs_g   - ${target.carbsG}) +
            abs(fat_g     - ${target.fatG})
      , 1) AS distance
    FROM scaled
    WHERE servings BETWEEN ${minServings} AND ${maxServings}
    ORDER BY distance ASC
    LIMIT ${limit}`;
}
