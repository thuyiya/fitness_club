#!/usr/bin/env node
/**
 * Validates the seed corpus before it is loaded into Postgres.
 *
 *   node packages/db/seed/validate.mjs
 *
 * Checks that every file parses, ids are unique within a file, every
 * cross-file reference resolves, values that back a Drizzle enum are legal,
 * and the cached macros on each meal agree with the sum over its ingredients.
 * Exits non-zero on any error so it can gate CI.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SEED_DIR = dirname(fileURLToPath(import.meta.url));

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

/** Parses a seed file, or records an error and returns `{}`. */
function read(rel) {
  const path = join(SEED_DIR, rel);
  if (!existsSync(path)) {
    err(rel, "file is missing");
    return {};
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    err(rel, `invalid JSON -- ${e.message}`);
    return {};
  }
}

/** Reads the `items` array of a seed file and enforces unique ids. */
function load(rel) {
  const doc = read(rel);
  if (doc.items === undefined) return [];
  if (!Array.isArray(doc.items)) {
    err(rel, "expected a top-level `items` array");
    return [];
  }
  const seen = new Set();
  for (const item of doc.items) {
    if (!item.id) err(rel, `an item has no id: ${JSON.stringify(item).slice(0, 80)}`);
    else if (seen.has(item.id)) err(rel, `duplicate id "${item.id}"`);
    else seen.add(item.id);
  }
  return doc.items;
}

/** Every reference in `field` must resolve to an id in `pool`. */
function refs(rel, items, field, pool, poolName) {
  for (const item of items) {
    const value = item[field];
    if (value === undefined || value === null) continue;
    for (const ref of Array.isArray(value) ? value : [value]) {
      if (!pool.has(ref)) err(rel, `${item.id}.${field} -> "${ref}" is not in ${poolName}`);
    }
  }
}

const idsOf = (items) => new Set(items.map((i) => i.id));

// ---------------------------------------------------------------- reference
const activityLevels = load("reference/activity-levels.json");
const goalTypes = load("reference/goal-types.json");
const muscleGroups = load("reference/muscle-groups.json");
const equipment = load("reference/equipment.json");
const taxonomy = read("reference/exercise-categories.json");
const dietaryDoc = read("reference/dietary-tags.json");
const dietaryTags = load("reference/dietary-tags.json");
const allergens = load("reference/allergens.json");
const mealTypeDoc = read("reference/meal-types.json");
const goalMetrics = load("reference/goal-metrics.json");
const measurementSites = load("reference/measurement-sites.json");
const difficulties = load("reference/difficulty-levels.json");
const injuries = load("reference/injury-limitations.json");
const disciplines = load("reference/disciplines.json");
const loggingModes = load("reference/logging-modes.json");
const exerciseTags = load("reference/exercise-tags.json");
const sportProfileDoc = read("reference/sport-nutrition-profiles.json");
const sportProfiles = load("reference/sport-nutrition-profiles.json");
const hydration = read("reference/hydration.json");
const units = read("reference/units.json");

const muscleIds = idsOf(muscleGroups);
const equipmentIds = idsOf(equipment);
const categoryIds = new Set((taxonomy.categories ?? []).map((c) => c.id));
const patternIds = new Set((taxonomy.movementPatterns ?? []).map((p) => p.id));
const foodClassIds = new Set((dietaryDoc.foodClasses ?? []).map((c) => c.id));
const dietaryIds = idsOf(dietaryTags);
const allergenIds = idsOf(allergens);
const difficultyIds = idsOf(difficulties);
const disciplineIds = idsOf(disciplines);
const loggingModeIds = idsOf(loggingModes);
const exerciseTagIds = idsOf(exerciseTags);

// `mealType` is a Postgres enum, so only the four enumBacked values may be
// stored in the column; the tags are free-form labels on top of it.
const enumMealTypes = new Set((mealTypeDoc.enumBacked ?? []).map((m) => m.id));
const mealTagIds = new Set((mealTypeDoc.tags ?? []).map((m) => m.id));

// A tag's `excludes` names food classes -- the vocabulary each food declares.
for (const tag of dietaryTags) {
  for (const ex of tag.excludes ?? []) {
    if (!foodClassIds.has(ex)) err("reference/dietary-tags.json", `${tag.id}.excludes -> "${ex}" is not a declared foodClass`);
  }
}

// Injuries steer plan generation away from movement patterns AND whole
// categories (plyometric, balance), so both vocabularies are legal here.
const avoidable = new Set([...patternIds, ...categoryIds]);
refs("reference/injury-limitations.json", injuries, "avoidPatterns", avoidable, "movement patterns or categories");
refs("reference/injury-limitations.json", injuries, "preferPatterns", avoidable, "movement patterns or categories");
if (!read("reference/injury-limitations.json").disclaimer) {
  err("reference/injury-limitations.json", "the not-medical-advice disclaimer is missing");
}

// PAL multipliers must ascend and stay inside the published Mifflin-St Jeor range.
let lastPal = 0;
for (const level of activityLevels) {
  const pal = level.multiplier ?? level.palMultiplier;
  if (typeof pal !== "number") err("reference/activity-levels.json", `${level.id} has no multiplier`);
  else if (pal < 1.2 || pal > 1.9) err("reference/activity-levels.json", `${level.id} PAL ${pal} outside 1.2-1.9`);
  else if (pal <= lastPal) err("reference/activity-levels.json", `${level.id} PAL ${pal} not greater than the previous level`);
  else lastPal = pal;
}

// Goal metrics drive one generic evaluation job, so their shape must be exact.
const AGGREGATES = new Set(["sum", "avg", "min", "max", "latest", "count"]);
const COMPARATORS = new Set(["gte", "lte", "eq"]);
for (const metric of goalMetrics) {
  if (!AGGREGATES.has(metric.aggregate)) err("reference/goal-metrics.json", `${metric.id}: unknown aggregate "${metric.aggregate}"`);
  if (!COMPARATORS.has(metric.comparator)) err("reference/goal-metrics.json", `${metric.id}: unknown comparator "${metric.comparator}"`);
}

// ------------------------------------------------------------------ catalog
const ingredientDoc = read("catalog/ingredients.json");
const ingredients = load("catalog/ingredients.json");
const foodGroups = new Set(ingredientDoc.groups ?? []);
const meals = load("catalog/meals.json");
const exercises = load("catalog/exercises.json");
const activities = load("catalog/activities.json");
const surveys = load("catalog/survey-templates.json");

refs("catalog/ingredients.json", ingredients, "allergens", allergenIds, "allergens");
refs("catalog/ingredients.json", ingredients, "dietaryTags", dietaryIds, "dietary tags");
refs("catalog/ingredients.json", ingredients, "foodClasses", foodClassIds, "food classes");

const tagExcludes = new Map(dietaryTags.map((t) => [t.id, t.excludes ?? []]));

for (const food of ingredients) {
  const n = food.per100g;
  if (!n) { err("catalog/ingredients.json", `${food.id} has no per100g block`); continue; }
  if (!foodGroups.has(food.group)) err("catalog/ingredients.json", `${food.id}.group "${food.group}" is not a declared group`);
  if (!food.defaultServing?.grams) err("catalog/ingredients.json", `${food.id} has no defaultServing.grams`);
  // Macros must be energetically plausible under the 4/4/9 factors.
  const derived = n.proteinG * 4 + n.carbsG * 4 + n.fatG * 9;
  if (n.energyKcal > 5 && Math.abs(derived - n.energyKcal) > Math.max(20, n.energyKcal * 0.15)) {
    warn("catalog/ingredients.json", `${food.id}: ${n.energyKcal} kcal stated but macros imply ${Math.round(derived)}`);
  }
  if (n.saturatedFatG > n.fatG + 0.05) err("catalog/ingredients.json", `${food.id}: saturated fat exceeds total fat`);
  if (n.sugarG != null && n.sugarG > n.carbsG + 0.05) err("catalog/ingredients.json", `${food.id}: sugar exceeds total carbs`);
  if (n.fiberG != null && n.fiberG > n.carbsG + 0.05) err("catalog/ingredients.json", `${food.id}: fibre exceeds total carbs`);
  // An allergen declaration and a "free of" tag must never both be present.
  for (const [allergen, tag] of [["milk", "dairy_free"], ["eggs", "egg_free"], ["tree_nuts", "nut_free"], ["peanuts", "nut_free"], ["wheat", "gluten_free"], ["cereals_gluten", "gluten_free"]]) {
    if (food.allergens?.includes(allergen) && food.dietaryTags?.includes(tag)) {
      err("catalog/ingredients.json", `${food.id} declares the "${allergen}" allergen but claims "${tag}"`);
    }
  }
  // A food may not claim a tag whose excluded classes it contains.
  for (const tag of food.dietaryTags ?? []) {
    const clash = (tagExcludes.get(tag) ?? []).filter((c) => (food.foodClasses ?? []).includes(c));
    if (clash.length) err("catalog/ingredients.json", `${food.id} claims "${tag}" but contains ${clash.join(", ")}`);
  }
}

// Meals: references resolve, tags are honest, and cached macros match the sum.
const foodById = new Map(ingredients.map((f) => [f.id, f]));
for (const meal of meals) {
  if (!enumMealTypes.has(meal.defaultMealType)) {
    err("catalog/meals.json", `${meal.id}.defaultMealType "${meal.defaultMealType}" is not one of ${[...enumMealTypes].join(", ")}`);
  }
  for (const tag of meal.tags ?? []) {
    if (!dietaryIds.has(tag) && !mealTagIds.has(tag)) err("catalog/meals.json", `${meal.id}.tags -> "${tag}" is neither a dietary tag nor a meal tag`);
  }
  if (!Array.isArray(meal.ingredients) || meal.ingredients.length === 0) {
    err("catalog/meals.json", `${meal.id} has no ingredients`);
    continue;
  }
  const sum = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const classes = new Set();
  for (const line of meal.ingredients) {
    const food = foodById.get(line.foodId);
    if (!food) {
      err("catalog/meals.json", `${meal.id} -> "${line.foodId}" is not in ingredients.json`);
      continue;
    }
    const factor = line.quantity / 100; // every catalog food is per 100 g / 100 ml
    sum.calories += food.per100g.energyKcal * factor;
    sum.proteinG += food.per100g.proteinG * factor;
    sum.carbsG += food.per100g.carbsG * factor;
    sum.fatG += food.per100g.fatG * factor;
    for (const c of food.foodClasses ?? []) classes.add(c);
  }
  // The dietary claim on the meal must survive its actual ingredients.
  for (const tag of meal.tags ?? []) {
    const clash = (tagExcludes.get(tag) ?? []).filter((c) => classes.has(c));
    if (clash.length) err("catalog/meals.json", `${meal.id} claims "${tag}" but its ingredients contain ${clash.join(", ")}`);
  }
  for (const key of ["calories", "proteinG", "carbsG", "fatG"]) {
    const stated = meal[key];
    const actual = sum[key];
    const tolerance = key === "calories" ? Math.max(8, actual * 0.02) : Math.max(1, actual * 0.03);
    if (Math.abs(stated - actual) > tolerance) {
      err("catalog/meals.json", `${meal.id}.${key}: stated ${stated}, ingredients sum to ${actual.toFixed(1)}`);
    }
  }
}

// Exercises: taxonomy references plus progression chains that point both ways.
const exerciseIds = idsOf(exercises);
refs("catalog/exercises.json", exercises, "muscleGroups", muscleIds, "muscle groups");
refs("catalog/exercises.json", exercises, "primaryMuscle", muscleIds, "muscle groups");
refs("catalog/exercises.json", exercises, "equipment", equipmentIds, "equipment");
refs("catalog/exercises.json", exercises, "category", categoryIds, "exercise categories");
refs("catalog/exercises.json", exercises, "movementPattern", patternIds, "movement patterns");
refs("catalog/exercises.json", exercises, "difficulty", difficultyIds, "difficulty levels");
refs("catalog/exercises.json", exercises, "discipline", disciplineIds, "disciplines");
refs("catalog/exercises.json", exercises, "loggingMode", loggingModeIds, "logging modes");
refs("catalog/exercises.json", exercises, "tags", exerciseTagIds, "exercise tags");
refs("catalog/exercises.json", exercises, "regressions", exerciseIds, "exercises.json");
refs("catalog/exercises.json", exercises, "progressions", exerciseIds, "exercises.json");

const exById = new Map(exercises.map((e) => [e.id, e]));
for (const ex of exercises) {
  if (ex.primaryMuscle && !(ex.muscleGroups ?? []).includes(ex.primaryMuscle)) {
    err("catalog/exercises.json", `${ex.id}: primaryMuscle "${ex.primaryMuscle}" is not among its muscleGroups`);
  }
  for (const harder of ex.progressions ?? []) {
    const t = exById.get(harder);
    if (t && !(t.regressions ?? []).includes(ex.id)) {
      err("catalog/exercises.json", `${ex.id} progresses to ${harder}, but ${harder} does not list it as a regression`);
    }
  }
  for (const easier of ex.regressions ?? []) {
    const t = exById.get(easier);
    if (t && !(t.progressions ?? []).includes(ex.id)) {
      err("catalog/exercises.json", `${ex.id} regresses to ${easier}, but ${easier} does not list it as a progression`);
    }
  }
  if (ex.id === ex.regressions?.[0] || (ex.progressions ?? []).includes(ex.id)) {
    err("catalog/exercises.json", `${ex.id} links to itself`);
  }
  // The two facets have to agree: a held movement is logged in seconds.
  if (ex.loggingMode === "hold" && !(ex.tags ?? []).includes("isometric")) {
    err("catalog/exercises.json", `${ex.id}: logged as a hold but not tagged isometric`);
  }
  if ((ex.tags ?? []).includes("no_equipment") && (ex.equipment ?? []).some((k) => k !== "bodyweight")) {
    err("catalog/exercises.json", `${ex.id}: tagged no_equipment but requires ${ex.equipment.join(", ")}`);
  }
  if (ex.discipline === "gym" && (ex.tags ?? []).includes("no_equipment")) {
    err("catalog/exercises.json", `${ex.id}: a gym exercise cannot be tagged no_equipment`);
  }
  if (ex.met != null && (ex.met < 1 || ex.met > 23)) {
    err("catalog/exercises.json", `${ex.id}: MET ${ex.met} outside the Compendium range 1-23`);
  }
}


// An exercise whose NAME names a piece of equipment must list it. This catches
// the class of bug where "Ab wheel rollout" claims to need only bodyweight,
// which silently corrupts the "what can I train with only this kit?" filter.
const NAME_IMPLIES_KIT = [
  [/\bab wheel\b/i, "ab_wheel"],
  [/\bbarbell\b/i, "barbell"],
  [/\bdumbbell\b/i, "dumbbell"],
  [/\bkettlebell\b/i, "kettlebell"],
  [/\bcable\b/i, "cable"],
  [/\bsmith machine\b/i, "smith_machine"],
  [/\bring\b/i, "gymnastic_rings"],
  [/\btrx\b/i, "trx"],
  [/\bfoam roll/i, "foam_roller"],
  [/\bbattle rope/i, "battle_ropes"],
  [/\bjump rope\b/i, "jump_rope"],
  [/\btreadmill\b/i, "treadmill"],
  [/\bbox jump\b/i, "plyo_box"],
  [/\bnordic\b/i, "ankle_anchor"],
  [/\belliptical\b/i, "elliptical"],
];
for (const ex of exercises) {
  for (const [pattern, kit] of NAME_IMPLIES_KIT) {
    if (pattern.test(ex.name) && !(ex.equipment ?? []).includes(kit)) {
      err("catalog/exercises.json", `${ex.id}: "${ex.name}" implies ${kit} but equipment is ${JSON.stringify(ex.equipment)}`);
    }
  }
}

// Activities carry the MET used by kcal = MET * 3.5 * kg / 200 * minutes, and
// the stated intensity band has to agree with that MET or the two UIs disagree.
// Standard ACSM bands: light below 3 METs, moderate 3 to 6 inclusive, vigorous above 6.
const BANDS = { light: [1, 3], moderate: [3, 6.0001], vigorous: [6.0001, 23.0001] };
const ACTIVITY_KINDS = new Set(["sport", "training_session", "daily_living"]);
for (const a of activities) {
  if (typeof a.met !== "number") { err("catalog/activities.json", `${a.id} has no MET value`); continue; }
  if (a.met < 1 || a.met > 23) err("catalog/activities.json", `${a.id}: MET ${a.met} outside 1-23`);
  const band = BANDS[a.intensity];
  if (!band) err("catalog/activities.json", `${a.id}: unknown intensity "${a.intensity}"`);
  else if (a.met < band[0] || a.met >= band[1]) {
    err("catalog/activities.json", `${a.id}: MET ${a.met} does not sit in the "${a.intensity}" band`);
  }
  if (!a.group) err("catalog/activities.json", `${a.id} has no group`);
  if (!ACTIVITY_KINDS.has(a.kind)) err("catalog/activities.json", `${a.id}: unknown kind "${a.kind}"`);
  // An activity is logged as a bout, so it must never carry set-based fields.
  for (const f of ["sets", "reps", "movementPattern", "discipline"]) {
    if (a[f] !== undefined) err("catalog/activities.json", `${a.id} carries "${f}" --- activities are logged by duration, not sets`);
  }
}

// Sport nutrition profiles: a member's sport of focus drives macro targets.
const activityIds = idsOf(activities);
const profileTypes = new Set((sportProfileDoc.types ?? []).map((t) => t.id));
for (const p of sportProfiles) {
  if (!profileTypes.has(p.type)) err("reference/sport-nutrition-profiles.json", `${p.id}: unknown type "${p.type}"`);
  for (const ref of p.activityIds ?? []) {
    if (!activityIds.has(ref)) err("reference/sport-nutrition-profiles.json", `${p.id}.activityIds -> "${ref}" is not an activity`);
  }
  const c = p.carbsGPerKg ?? {};
  const pr = p.proteinGPerKg ?? {};
  if (!(c.lose <= c.maintain && c.maintain <= c.gain)) err("reference/sport-nutrition-profiles.json", `${p.id}: carb targets are not ordered lose <= maintain <= gain`);
  // ACSM/ISSN ranges: carbohydrate 3-12 g/kg, protein 1.2-2.2 g/kg.
  for (const [goal, val] of Object.entries(c)) {
    if (val < 3 || val > 12) err("reference/sport-nutrition-profiles.json", `${p.id}.carbsGPerKg.${goal} = ${val} outside the 3-12 g/kg range`);
  }
  for (const [goal, val] of Object.entries(pr)) {
    if (val < 1.2 || val > 2.2) err("reference/sport-nutrition-profiles.json", `${p.id}.proteinGPerKg.${goal} = ${val} outside the 1.2-2.2 g/kg range`);
  }
}

// Survey questions: contiguous positions and the right options shape per type.
// These two sets mirror the question_type and recurrence Postgres enums --- if
// the schema gains a value, widen it here too.
const QUESTION_TYPES = new Set(["single_choice", "multi_choice", "scale", "short_text", "long_text", "date", "boolean"]);
const RECURRENCE = new Set(["once", "daily", "weekly", "biweekly", "monthly"]);
const CHOICE = new Set(["single_choice", "multi_choice"]);
for (const survey of surveys) {
  const questions = survey.questions ?? [];
  if (!questions.length) err("catalog/survey-templates.json", `${survey.id} has no questions`);
  if (!RECURRENCE.has(survey.repeats)) err("catalog/survey-templates.json", `${survey.id}.repeats "${survey.repeats}" is not a recurrence enum value`);
  questions.forEach((q, i) => {
    const at = `${survey.id}[${i}]`;
    if (q.position !== i) err("catalog/survey-templates.json", `${at}: position ${q.position}, expected ${i}`);
    if (!q.prompt) err("catalog/survey-templates.json", `${at}: no prompt`);
    if (!QUESTION_TYPES.has(q.type)) err("catalog/survey-templates.json", `${at}: "${q.type}" is not a question_type enum value`);
    if (CHOICE.has(q.type)) {
      const choices = q.options?.choices;
      if (!Array.isArray(choices) || choices.length < 2) err("catalog/survey-templates.json", `${at}: ${q.type} needs an options.choices array of 2 or more`);
      else if (new Set(choices).size !== choices.length) err("catalog/survey-templates.json", `${at}: duplicate choices`);
    } else if (q.type === "scale") {
      const o = q.options ?? {};
      if (typeof o.min !== "number" || typeof o.max !== "number" || o.max <= o.min) {
        err("catalog/survey-templates.json", `${at}: scale needs numeric options.min < options.max`);
      }
    }
  });
}

// --------------------------------------------------------------------- report
const counts = {
  "activity levels": activityLevels.length,
  "goal types": goalTypes.length,
  "muscle groups": muscleGroups.length,
  equipment: equipment.length,
  "exercise categories": categoryIds.size,
  "movement patterns": patternIds.size,
  "food classes": foodClassIds.size,
  "dietary tags": dietaryTags.length,
  allergens: allergens.length,
  "goal metrics": goalMetrics.length,
  "measurement sites": measurementSites.length,
  "difficulty levels": difficulties.length,
  injuries: injuries.length,
  "food groups": foodGroups.size,
  ingredients: ingredients.length,
  meals: meals.length,
  exercises: exercises.length,
  activities: activities.length,
  disciplines: disciplines.length,
  "logging modes": loggingModes.length,
  "exercise tags": exerciseTags.length,
  "sport nutrition profiles": sportProfiles.length,
  "survey templates": surveys.length,
  "survey questions": surveys.reduce((n, s) => n + (s.questions?.length ?? 0), 0),
};
for (const [label, n] of Object.entries(counts)) console.log(`  ${String(n).padStart(4)}  ${label}`);
if (!hydration.baseline?.mlPerKgBodyweight) err("reference/hydration.json", "baseline.mlPerKgBodyweight is missing");
if (!units.mass) err("reference/units.json", "mass units are missing");

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  x ${e}`);
  process.exit(1);
}
console.log("\nseed corpus OK");
