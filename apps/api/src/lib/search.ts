import { client } from "../db.js";
import { embed, toVectorLiteral } from "@wellness/embeddings";

/**
 * Whether pgvector is installed. Semantic endpoints degrade to trigram search
 * when it is not, rather than 500ing --- the extension needs an image the host
 * may not have pulled yet (see packages/db/migrations/0003_pgvector.sql).
 */
let vectorReady: boolean | null = null;
export async function hasVector(): Promise<boolean> {
  if (vectorReady !== null) return vectorReady;
  const rows = await client`SELECT 1 FROM pg_extension WHERE extname = 'vector'`;
  vectorReady = rows.length > 0;
  return vectorReady;
}

/**
 * Lexical fallback and first-pass filter. pg_trgm rather than a btree because
 * nobody types a food name from its first character: "greek yogurt" has to
 * match "Yogurt, Greek, 0% fat".
 */
/**
 * Provenance tier, applied to `foods` only, as a tie-break BEFORE name.
 *
 * The USDA import added ~1.9M branded products against ~14k generic ones, and
 * they score identically on trigram: "chicken breast" matches "Chicken, breast,
 * meat only, raw" and "100% ALL NATURAL CHICKEN BREAST MINI NUGGETS PATTY
 * FRITTERS" equally well. Alphabetically the nuggets win, so without this a
 * search that used to return the food someone meant now returns eight brands of
 * frozen nugget. Generic reference foods first, branded SKUs after.
 *
 * Length is the last tie-break: among rows of the same provenance the shorter
 * name is the more generic one.
 */
const FOOD_RANK = client`
  CASE
    WHEN source <> 'usda' THEN 0
    WHEN usda_data_type <> 'branded_food' THEN 1
    ELSE 2
  END, length(name),`;

export async function trigramSearch(table: "foods" | "meals" | "exercises", term: string, limit: number) {
  // word_similarity, not similarity: the query is a few characters and the
  // stored name is a long phrase, so whole-string similarity scores "yogrt"
  // against "Greek yogurt, 0% fat" at 0.19 and drops it below the 0.3
  // threshold. Matching the best WORD instead scores it 0.50. The `<%`
  // operator is index-backed by the GIN trgm index.
  // Meals and foods carry their macros in the result: a search row that is
  // only {id, name} forces the client into an N+1 just to show what the member
  // is about to log, and they end up logging blind.
  const extra =
    table === "meals"
      ? client`, calories, protein_g AS "proteinG", carbs_g AS "carbsG", fat_g AS "fatG", default_meal_type AS "mealType", tags, allergens, photo_url AS "photoUrl", prep_minutes AS "prepMinutes"`
      : table === "foods"
        ? client`, calories, protein_g AS "proteinG", carbs_g AS "carbsG", fat_g AS "fatG", serving_size AS "servingSize", serving_unit AS "servingUnit", allergens, image_url AS "imageUrl"`
        : client`, discipline::text, logging_mode::text AS "loggingMode", equipment, muscle_groups AS "muscleGroups", met`;

  const rank = table === "foods" ? FOOD_RANK : client``;
  return client`
    SELECT id, name, word_similarity(${term}, name) AS score ${extra}
    FROM ${client(table)}
    WHERE ${term} <% name
    ORDER BY score DESC, ${rank} name
    LIMIT ${limit}`;
}

/**
 * Cosine nearest-neighbour over the HNSW index.
 *
 * Deliberately NOT used for macro targeting: that is exact numeric distance in
 * four known dimensions, which SQL does exactly and with hard constraints an
 * approximate index cannot honour. An allergen exclusion must never be
 * approximate. Vectors are for "something like chicken teriyaki but
 * vegetarian", where the dimensions cannot be enumerated.
 */
export async function vectorSearch(table: "foods" | "meals" | "exercises", term: string, limit: number) {
  const literal = toVectorLiteral(await embed(term));
  const extra =
    table === "meals"
      ? client`, calories, protein_g AS "proteinG", carbs_g AS "carbsG", fat_g AS "fatG", default_meal_type AS "mealType", tags, allergens, photo_url AS "photoUrl", prep_minutes AS "prepMinutes"`
      : table === "foods"
        ? client`, calories, protein_g AS "proteinG", carbs_g AS "carbsG", fat_g AS "fatG", serving_size AS "servingSize", serving_unit AS "servingUnit", allergens, image_url AS "imageUrl"`
        : client`, discipline::text, logging_mode::text AS "loggingMode", equipment, muscle_groups AS "muscleGroups", met`;

  return client`
    SELECT id, name, 1 - (embedding <=> ${literal}::vector) AS score ${extra}
    FROM ${client(table)}
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${literal}::vector
    LIMIT ${limit}`;
}

/**
 * Trigram and vector answer different questions, so search keeps both --- but
 * blending them unconditionally makes results WORSE, not better.
 *
 * A one-or-two word query is someone typing a name. "chiken" should return
 * Chicken breast; an embedding model scores "chiken" closest to "Chia seeds",
 * because it reads a typo as a concept. Even a small vector weight is enough
 * to lift the wrong row to the top. So for name-like queries the lexical
 * result IS the result, and vectors only fill the tail when trigram comes back
 * empty.
 *
 * A longer phrase is someone describing what they want ("food for after a hard
 * workout"), which is precisely where lexical matching returns nothing. There
 * the two are fused by reciprocal rank --- ranks, not scores, because a
 * trigram similarity and a cosine distance share no common axis.
 */
export async function hybridSearch(table: "foods" | "meals" | "exercises", term: string, limit: number) {
  const looksLikeAName = term.trim().split(/\s+/).length <= 2;

  const [lexical, semantic] = await Promise.all([
    trigramSearch(table, term, limit * 2),
    (await hasVector()) ? vectorSearch(table, term, limit * 2) : Promise.resolve([]),
  ]);

  const shape = (rows: readonly Record<string, unknown>[], via: string) =>
    rows.map((r) => ({ ...r, via: [via] })) as (Record<string, unknown> & { id: string; name: string; via: string[] })[];

  if (looksLikeAName) {
    const out = shape(lexical as never, "trigram");
    const seen = new Set(out.map((r) => r.id));
    // Vectors only pad the tail; they never displace a lexical hit.
    for (const row of shape(semantic as never, "vector")) {
      if (out.length >= limit) break;
      if (!seen.has(row.id)) out.push(row);
    }
    return out.slice(0, limit);
  }

  const K = 60; // RRF damping; the constant from the original paper.
  const scores = new Map<string, Record<string, unknown> & { id: string; score: number; via: string[] }>();
  const fold = (rows: readonly Record<string, unknown>[], via: string, weight: number) =>
    rows.forEach((row, rank) => {
      const id = row.id as string;
      // Keep every column the row carries --- the client needs the macros.
      const hit = scores.get(id) ?? { ...row, id, score: 0, via: [] };
      hit.score += weight / (K + rank + 1);
      hit.via.push(via);
      scores.set(id, hit);
    });

  fold(lexical as never, "trigram", 1);
  fold(semantic as never, "vector", 2);
  return [...scores.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
