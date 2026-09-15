#!/usr/bin/env node
/**
 * Backfills the `embedding` column on foods, meals and exercises.
 *
 *   DATABASE_URL=postgres://... node packages/db/seed/embed.mjs [--force]
 *
 * Only rows with a NULL embedding are processed unless --force is given, so a
 * re-run after adding catalog rows is cheap. Requires migration 0003_pgvector.
 */
import postgres from "postgres";
import { describe, embedBatch, toVectorLiteral } from "@wellness/embeddings";

const force = process.argv.includes("--force");
const sql = postgres(
  process.env.DATABASE_URL ?? "postgres://wellness:localdev_only_not_a_real_secret@localhost:5432/wellness",
  { max: 2, onnotice: () => {} },
);

const [ext] = await sql`SELECT 1 FROM pg_extension WHERE extname = 'vector'`;
if (!ext) {
  console.error("pgvector is not installed. Apply packages/db/migrations/0003_pgvector.sql first.");
  await sql.end();
  process.exit(1);
}

/** Embeds in batches so the model is invoked a few times, not once per row. */
async function backfill(label, rows, toText, update) {
  if (rows.length === 0) return `${label}: nothing to do`;
  const BATCH = 32;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const vectors = await embedBatch(slice.map(toText));
    for (let k = 0; k < slice.length; k++) await update(slice[k], toVectorLiteral(vectors[k]));
    done += slice.length;
    process.stdout.write(`\r  ${label}: ${done}/${rows.length}`);
  }
  process.stdout.write("\r");
  return `${label}: ${done} embedded`;
}

const filter = force ? sql`` : sql`WHERE embedding IS NULL`;

try {
  const foods = await sql`SELECT id, name, brand, "group", dietary_tags FROM foods ${filter}`;
  console.log(
    await backfill(
      "foods",
      foods,
      (f) => describe.food({ name: f.name, brand: f.brand, group: f.group, dietaryTags: f.dietary_tags }),
      (row, vec) => sql`UPDATE foods SET embedding = ${vec}::vector WHERE id = ${row.id}`,
    ),
  );

  // A meal is embedded WITH its ingredient names: "high-protein oats" alone
  // does not tell the model there is whey and blueberries in it.
  const meals = await sql`
    SELECT m.id, m.name, m.tags, coalesce(array_agg(f.name) FILTER (WHERE f.name IS NOT NULL), '{}') AS ingredients
    FROM meals m
    LEFT JOIN meal_ingredients mi ON mi.meal_id = m.id
    LEFT JOIN foods f ON f.id = mi.food_id
    ${force ? sql`` : sql`WHERE m.embedding IS NULL`}
    GROUP BY m.id`;
  console.log(
    await backfill(
      "meals",
      meals,
      (m) => describe.meal({ name: m.name, tags: m.tags, ingredients: m.ingredients }),
      (row, vec) => sql`UPDATE meals SET embedding = ${vec}::vector WHERE id = ${row.id}`,
    ),
  );

  const exercises = await sql`
    SELECT id, name, description, discipline::text, category::text, movement_pattern::text, muscle_groups, equipment, tags
    FROM exercises ${filter}`;
  console.log(
    await backfill(
      "exercises",
      exercises,
      (e) =>
        describe.exercise({
          name: e.name,
          description: e.description,
          discipline: e.discipline,
          category: e.category,
          movementPattern: e.movement_pattern,
          muscleGroups: e.muscle_groups,
          equipment: e.equipment,
          tags: e.tags,
        }),
      (row, vec) => sql`UPDATE exercises SET embedding = ${vec}::vector WHERE id = ${row.id}`,
    ),
  );

  // HNSW builds a better graph over populated data than over an empty table.
  console.log("  reindexing HNSW...");
  await sql`REINDEX INDEX foods_embedding_idx`;
  await sql`REINDEX INDEX meals_embedding_idx`;
  await sql`REINDEX INDEX exercises_embedding_idx`;
  console.log("embeddings complete");
} catch (e) {
  console.error("\nembedding FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
