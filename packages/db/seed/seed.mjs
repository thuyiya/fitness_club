#!/usr/bin/env node
/**
 * Loads the validated JSON corpus into Postgres.
 *
 *   DATABASE_URL=postgres://... node packages/db/seed/seed.mjs
 *
 * Idempotent: every catalog row is keyed by `slug`, so a re-run updates in
 * place rather than duplicating. Platform rows have a NULL owner_coach_id,
 * which is what marks them as catalog rather than coach-authored.
 *
 * Run validate.mjs first --- this script trusts the corpus and will happily
 * load contradictory data.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const SEED_DIR = dirname(fileURLToPath(import.meta.url));
const read = (rel) => JSON.parse(readFileSync(join(SEED_DIR, rel), "utf8"));

const sql = postgres(
  process.env.DATABASE_URL ?? "postgres://wellness:localdev_only_not_a_real_secret@localhost:5432/wellness",
  { max: 4, onnotice: () => {} },
);

/** Liquids are measured per 100 ml; the number is the same, the unit is not. */
const LIQUID_GROUPS = new Set(["beverages"]);

async function seedSportProfiles() {
  const { items } = read("reference/sport-nutrition-profiles.json");
  for (const p of items) {
    await sql`
      INSERT INTO sport_profiles (slug, label, type, carbs_lose, carbs_maintain, carbs_gain, protein_lose, protein_maintain, protein_gain)
      VALUES (${p.id}, ${p.label}, ${p.type}, ${p.carbsGPerKg.lose}, ${p.carbsGPerKg.maintain}, ${p.carbsGPerKg.gain},
              ${p.proteinGPerKg.lose}, ${p.proteinGPerKg.maintain}, ${p.proteinGPerKg.gain})
      ON CONFLICT (slug) DO UPDATE SET
        label = EXCLUDED.label, type = EXCLUDED.type,
        carbs_lose = EXCLUDED.carbs_lose, carbs_maintain = EXCLUDED.carbs_maintain, carbs_gain = EXCLUDED.carbs_gain,
        protein_lose = EXCLUDED.protein_lose, protein_maintain = EXCLUDED.protein_maintain, protein_gain = EXCLUDED.protein_gain`;
  }
  return items.length;
}

async function seedActivities() {
  const { items } = read("catalog/activities.json");
  for (const a of items) {
    await sql`
      INSERT INTO activities (slug, name, kind, "group", met, intensity, indoor, tracks_distance, health_kit_type)
      VALUES (${a.id}, ${a.name}, ${a.kind}, ${a.group}, ${a.met}, ${a.intensity}, ${a.indoor}, ${a.tracksDistance}, ${a.healthKitType ?? null})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, kind = EXCLUDED.kind, "group" = EXCLUDED."group", met = EXCLUDED.met,
        intensity = EXCLUDED.intensity, indoor = EXCLUDED.indoor,
        tracks_distance = EXCLUDED.tracks_distance, health_kit_type = EXCLUDED.health_kit_type`;
  }
  return items.length;
}

async function seedFoods() {
  const { items } = read("catalog/ingredients.json");
  for (const f of items) {
    const n = f.per100g;
    const unit = LIQUID_GROUPS.has(f.group) ? "ml" : "g";
    await sql`
      INSERT INTO foods (slug, source, external_id, owner_coach_id, name, brand, "group", image_url,
                         serving_size, serving_unit, calories, protein_g, carbs_g, fat_g,
                         saturated_fat_g, fiber_g, sugar_g, sodium_mg,
                         allergens, food_classes, dietary_tags, is_verified)
      VALUES (${f.id}, ${f.source === "curated" ? "verified" : f.source}, ${f.externalId ?? null}, NULL,
              ${f.name}, NULL, ${f.group}, ${f.imageUrl ?? null},
              100, ${unit}, ${n.energyKcal}, ${n.proteinG}, ${n.carbsG}, ${n.fatG},
              ${n.saturatedFatG ?? null}, ${n.fiberG ?? null}, ${n.sugarG ?? null}, ${n.sodiumMg ?? null},
              ${f.allergens ?? []}, ${f.foodClasses ?? []}, ${f.dietaryTags ?? []}, ${f.verified ?? true})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, "group" = EXCLUDED."group", image_url = EXCLUDED.image_url,
        calories = EXCLUDED.calories, protein_g = EXCLUDED.protein_g, carbs_g = EXCLUDED.carbs_g, fat_g = EXCLUDED.fat_g,
        saturated_fat_g = EXCLUDED.saturated_fat_g, fiber_g = EXCLUDED.fiber_g,
        sugar_g = EXCLUDED.sugar_g, sodium_mg = EXCLUDED.sodium_mg,
        allergens = EXCLUDED.allergens, food_classes = EXCLUDED.food_classes, dietary_tags = EXCLUDED.dietary_tags`;
  }
  return items.length;
}

async function seedMeals() {
  const { items } = read("catalog/meals.json");
  const foods = await sql`SELECT id, slug, allergens FROM foods WHERE slug IS NOT NULL`;
  const bySlug = new Map(foods.map((f) => [f.slug, f]));

  for (const m of items) {
    // Allergens on a meal are the union of its ingredients', maintained here so
    // an exclusion filter is one index scan and never a join that might be skipped.
    const allergens = [...new Set(m.ingredients.flatMap((i) => bySlug.get(i.foodId)?.allergens ?? []))];
    const [row] = await sql`
      INSERT INTO meals (slug, owner_coach_id, name, default_meal_type, servings, prep_minutes,
                         is_template, tags, calories, protein_g, carbs_g, fat_g, allergens)
      VALUES (${m.id}, NULL, ${m.name}, ${m.defaultMealType}, ${m.servings ?? 1}, ${m.prepMinutes ?? null},
              true, ${m.tags ?? []}, ${m.calories}, ${m.proteinG}, ${m.carbsG}, ${m.fatG}, ${allergens})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, default_meal_type = EXCLUDED.default_meal_type, servings = EXCLUDED.servings,
        prep_minutes = EXCLUDED.prep_minutes, tags = EXCLUDED.tags, calories = EXCLUDED.calories,
        protein_g = EXCLUDED.protein_g, carbs_g = EXCLUDED.carbs_g, fat_g = EXCLUDED.fat_g,
        allergens = EXCLUDED.allergens, updated_at = now()
      RETURNING id`;

    // Ingredient lines are replaced wholesale --- simpler than diffing, and the
    // meal's macro cache above is already derived from exactly this list.
    await sql`DELETE FROM meal_ingredients WHERE meal_id = ${row.id}`;
    let position = 0;
    for (const line of m.ingredients) {
      const food = bySlug.get(line.foodId);
      if (!food) throw new Error(`meal ${m.id} references unknown food ${line.foodId}`);
      await sql`
        INSERT INTO meal_ingredients (meal_id, food_id, quantity, unit, position)
        VALUES (${row.id}, ${food.id}, ${line.quantity}, ${line.unit}, ${position++})`;
    }
  }
  return items.length;
}

async function seedExercises() {
  const { items } = read("catalog/exercises.json");
  for (const e of items) {
    await sql`
      INSERT INTO exercises (slug, owner_coach_id, name, description, discipline, category, movement_pattern,
                             muscle_groups, primary_muscle, equipment, difficulty, logging_mode, tags, met,
                             is_unilateral, is_compound, image_url, video_url, instructions,
                             form_cues, common_mistakes, safety_notes, regressions, progressions, is_custom)
      VALUES (${e.id}, NULL, ${e.name}, ${e.description ?? null}, ${e.discipline}, ${e.category}, ${e.movementPattern},
              ${e.muscleGroups ?? []}, ${e.primaryMuscle ?? null}, ${e.equipment ?? []}, ${e.difficulty},
              ${e.loggingMode}, ${e.tags ?? []}, ${e.met ?? null},
              ${e.isUnilateral ?? false}, ${e.isCompound ?? false}, ${e.imageUrl ?? null}, ${e.videoUrl ?? null},
              ${e.instructions ?? []}, ${e.formCues ?? []}, ${e.commonMistakes ?? []}, ${e.safetyNotes ?? null},
              ${e.regressions ?? []}, ${e.progressions ?? []}, false)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description, discipline = EXCLUDED.discipline,
        category = EXCLUDED.category, movement_pattern = EXCLUDED.movement_pattern,
        muscle_groups = EXCLUDED.muscle_groups, primary_muscle = EXCLUDED.primary_muscle,
        equipment = EXCLUDED.equipment, difficulty = EXCLUDED.difficulty, logging_mode = EXCLUDED.logging_mode,
        tags = EXCLUDED.tags, met = EXCLUDED.met, is_unilateral = EXCLUDED.is_unilateral,
        is_compound = EXCLUDED.is_compound, instructions = EXCLUDED.instructions, form_cues = EXCLUDED.form_cues,
        common_mistakes = EXCLUDED.common_mistakes, safety_notes = EXCLUDED.safety_notes,
        regressions = EXCLUDED.regressions, progressions = EXCLUDED.progressions`;
  }
  return items.length;
}

async function seedSurveys() {
  const { items } = read("catalog/survey-templates.json");
  let questions = 0;
  for (const s of items) {
    const [row] = await sql`
      INSERT INTO surveys (slug, owner_coach_id, title, description, status, repeats, is_template)
      VALUES (${s.id}, NULL, ${s.title}, ${s.description ?? null}, 'active', ${s.repeats}, true)
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title, description = EXCLUDED.description, repeats = EXCLUDED.repeats
      RETURNING id`;
    await sql`DELETE FROM survey_questions WHERE survey_id = ${row.id}`;
    for (const q of s.questions) {
      await sql`
        INSERT INTO survey_questions (survey_id, position, type, prompt, options, required)
        VALUES (${row.id}, ${q.position}, ${q.type}, ${q.prompt}, ${q.options ? sql.json(q.options) : null}, ${q.required ?? true})`;
      questions++;
    }
  }
  return `${items.length} templates / ${questions} questions`;
}

const steps = [
  ["sport profiles", seedSportProfiles],
  ["activities", seedActivities],
  ["foods", seedFoods],
  ["meals", seedMeals],
  ["exercises", seedExercises],
  ["surveys", seedSurveys],
];

try {
  for (const [label, fn] of steps) {
    const started = Date.now();
    const result = await fn();
    console.log(`  ${String(result).padStart(24)}  ${label}  (${Date.now() - started}ms)`);
  }
  console.log("\nseed complete");
} catch (e) {
  console.error("\nseed FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
