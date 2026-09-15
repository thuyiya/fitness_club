import { and, asc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { notFound } from "../errors.js";
import { hasVector, hybridSearch, trigramSearch, vectorSearch } from "../lib/search.js";
import { matchMeals } from "../lib/recommend.js";
import { pgTextArray } from "../lib/pg.js";

const listQuery = z.object({
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
  offset: z.coerce.number().min(0).default(0),
});

const exerciseQuery = listQuery.extend({
  discipline: z.enum(["calisthenics", "gym", "cardio", "mobility"]).optional(),
  category: z.string().optional(),
  movementPattern: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  equipment: z.string().optional().describe("comma-separated; matches exercises needing ONLY this kit"),
  muscle: z.string().optional(),
});


/**
 * Explicit column lists. Never `select()` on these tables: that pulls the
 * `embedding` column, and shipping 384 floats per row to a phone is wasteful
 * even once the column exists.
 */
const exerciseColumns = {
  id: schema.exercises.id,
  slug: schema.exercises.slug,
  name: schema.exercises.name,
  description: schema.exercises.description,
  discipline: schema.exercises.discipline,
  category: schema.exercises.category,
  movementPattern: schema.exercises.movementPattern,
  muscleGroups: schema.exercises.muscleGroups,
  primaryMuscle: schema.exercises.primaryMuscle,
  equipment: schema.exercises.equipment,
  difficulty: schema.exercises.difficulty,
  loggingMode: schema.exercises.loggingMode,
  tags: schema.exercises.tags,
  met: schema.exercises.met,
  isUnilateral: schema.exercises.isUnilateral,
  isCompound: schema.exercises.isCompound,
  imageUrl: schema.exercises.imageUrl,
  videoUrl: schema.exercises.videoUrl,
  instructions: schema.exercises.instructions,
  formCues: schema.exercises.formCues,
  commonMistakes: schema.exercises.commonMistakes,
  safetyNotes: schema.exercises.safetyNotes,
  regressions: schema.exercises.regressions,
  progressions: schema.exercises.progressions,
};

const foodColumns = {
  id: schema.foods.id,
  slug: schema.foods.slug,
  name: schema.foods.name,
  brand: schema.foods.brand,
  group: schema.foods.group,
  imageUrl: schema.foods.imageUrl,
  servingSize: schema.foods.servingSize,
  servingUnit: schema.foods.servingUnit,
  calories: schema.foods.calories,
  proteinG: schema.foods.proteinG,
  carbsG: schema.foods.carbsG,
  fatG: schema.foods.fatG,
  saturatedFatG: schema.foods.saturatedFatG,
  fiberG: schema.foods.fiberG,
  sugarG: schema.foods.sugarG,
  sodiumMg: schema.foods.sodiumMg,
  allergens: schema.foods.allergens,
  foodClasses: schema.foods.foodClasses,
  dietaryTags: schema.foods.dietaryTags,
  isVerified: schema.foods.isVerified,
};

const mealColumns = {
  id: schema.meals.id,
  slug: schema.meals.slug,
  name: schema.meals.name,
  photoUrl: schema.meals.photoUrl,
  defaultMealType: schema.meals.defaultMealType,
  servings: schema.meals.servings,
  prepMinutes: schema.meals.prepMinutes,
  tags: schema.meals.tags,
  allergens: schema.meals.allergens,
  calories: schema.meals.calories,
  proteinG: schema.meals.proteinG,
  carbsG: schema.meals.carbsG,
  fatG: schema.meals.fatG,
};

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  const auth = (req: Parameters<typeof app.requireAuth>[0]) => app.requireAuth(req);

  /** The exercise library. Every facet is filterable and they compose. */
  app.get("/exercises", { preHandler: auth }, async (req) => {
    const q = exerciseQuery.parse(req.query);
    const where = [
      // Catalog rows plus the caller's own custom exercises, nothing else.
      or(isNull(schema.exercises.ownerCoachId), eq(schema.exercises.ownerCoachId, req.user!.id))!,
    ];
    if (q.q) where.push(ilike(schema.exercises.name, `%${q.q}%`));
    if (q.discipline) where.push(eq(schema.exercises.discipline, q.discipline));
    if (q.category) where.push(sql`${schema.exercises.category}::text = ${q.category}`);
    if (q.movementPattern) where.push(sql`${schema.exercises.movementPattern}::text = ${q.movementPattern}`);
    if (q.difficulty) where.push(eq(schema.exercises.difficulty, q.difficulty));
    if (q.muscle) where.push(sql`${schema.exercises.muscleGroups} @> ${pgTextArray([q.muscle])}::text[]`);
    // "What can I do with only these?" --- the exercise's needs must be a
    // SUBSET of what the member has, not merely overlap with it.
    if (q.equipment) {
      const owned = q.equipment.split(",").map((s) => s.trim()).filter(Boolean);
      where.push(sql`${schema.exercises.equipment} <@ ${pgTextArray(owned)}::text[]`);
    }

    const rows = await db
      .select(exerciseColumns)
      .from(schema.exercises)
      .where(and(...where))
      .orderBy(asc(schema.exercises.name))
      .limit(q.limit)
      .offset(q.offset);
    return { items: rows, limit: q.limit, offset: q.offset };
  });

  app.get("/exercises/:slug", { preHandler: auth }, async (req) => {
    const { slug } = z.object({ slug: z.string() }).parse(req.params);
    const [row] = await db.select(exerciseColumns).from(schema.exercises).where(eq(schema.exercises.slug, slug)).limit(1);
    if (!row) throw notFound("Exercise");

    // Resolve the progression chain so the client can render it without n+1.
    const related = [...row.regressions, ...row.progressions];
    const chain = related.length
      ? await db
          .select({ slug: schema.exercises.slug, name: schema.exercises.name, difficulty: schema.exercises.difficulty })
          .from(schema.exercises)
          .where(inArray(schema.exercises.slug, related))
      : [];
    const bySlug = new Map(chain.map((c) => [c.slug, c]));
    return {
      exercise: row,
      regressions: row.regressions.map((s) => bySlug.get(s)).filter(Boolean),
      progressions: row.progressions.map((s) => bySlug.get(s)).filter(Boolean),
    };
  });

  /** Activities: bouts logged by duration and intensity, not sets. */
  app.get("/activities", { preHandler: auth }, async (req) => {
    const q = listQuery.extend({ kind: z.enum(["sport", "training_session", "daily_living"]).optional() }).parse(req.query);
    const where = [];
    if (q.q) where.push(ilike(schema.activities.name, `%${q.q}%`));
    if (q.kind) where.push(eq(schema.activities.kind, q.kind));
    const rows = await db
      .select()
      .from(schema.activities)
      .where(where.length ? and(...where) : undefined)
      .orderBy(asc(schema.activities.name))
      .limit(q.limit);
    return { items: rows };
  });

  app.get("/sport-profiles", { preHandler: auth }, async () => ({
    items: await db.select().from(schema.sportProfiles).orderBy(asc(schema.sportProfiles.label)),
  }));

  /**
   * Food search. Trigram first because it is exact and cheap; `semantic=true`
   * layers pgvector on top when the extension is present.
   */
  app.get("/foods", { preHandler: auth }, async (req) => {
    const q = listQuery
      .extend({
        excludeAllergens: z.string().optional(),
        dietaryTags: z.string().optional(),
        semantic: z.coerce.boolean().default(false),
      })
      .parse(req.query);

    const where = [or(isNull(schema.foods.ownerCoachId), eq(schema.foods.ownerCoachId, req.user!.id))!];
    if (q.q) where.push(ilike(schema.foods.name, `%${q.q}%`));
    if (q.excludeAllergens) {
      const bad = q.excludeAllergens.split(",").map((s) => s.trim()).filter(Boolean);
      // Hard exclusion, never a ranking signal.
      where.push(sql`NOT (${schema.foods.allergens} && ${pgTextArray(bad)}::text[])`);
    }
    if (q.dietaryTags) {
      const tags = q.dietaryTags.split(",").map((s) => s.trim()).filter(Boolean);
      where.push(sql`${schema.foods.dietaryTags} @> ${pgTextArray(tags)}::text[]`);
    }

    const rows = await db
      .select(foodColumns)
      .from(schema.foods)
      .where(and(...where))
      .orderBy(asc(schema.foods.name))
      .limit(q.limit)
      .offset(q.offset);
    return { items: rows, semanticAvailable: await hasVector() };
  });

  /** Meals, with their ingredient lines resolved. */
  app.get("/meals/:slug", { preHandler: auth }, async (req) => {
    const { slug } = z.object({ slug: z.string() }).parse(req.params);
    const [meal] = await db.select(mealColumns).from(schema.meals).where(eq(schema.meals.slug, slug)).limit(1);
    if (!meal) throw notFound("Meal");
    const lines = await db
      .select({
        quantity: schema.mealIngredients.quantity,
        unit: schema.mealIngredients.unit,
        position: schema.mealIngredients.position,
        food: {
          id: schema.foods.id,
          slug: schema.foods.slug,
          name: schema.foods.name,
          imageUrl: schema.foods.imageUrl,
          calories: schema.foods.calories,
          proteinG: schema.foods.proteinG,
          carbsG: schema.foods.carbsG,
          fatG: schema.foods.fatG,
          allergens: schema.foods.allergens,
        },
      })
      .from(schema.mealIngredients)
      .innerJoin(schema.foods, eq(schema.foods.id, schema.mealIngredients.foodId))
      .where(eq(schema.mealIngredients.mealId, meal.id))
      .orderBy(asc(schema.mealIngredients.position));
    return { meal, ingredients: lines };
  });

  /**
   * "I need 450 kcal with 40P/35C/15F" --- the macro-match recommender.
   * Exact numeric ranking with hard dietary constraints; see lib/recommend.ts
   * for why this is SQL and not a vector query.
   */
  app.post("/recommend/meals", { preHandler: auth }, async (req) => {
    const body = z
      .object({
        calories: z.number().positive(),
        proteinG: z.number().min(0),
        carbsG: z.number().min(0),
        fatG: z.number().min(0),
        excludeAllergens: z.array(z.string()).default([]),
        requireTags: z.array(z.string()).default([]),
        mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).nullish(),
        limit: z.number().min(1).max(50).default(10),
      })
      .parse(req.body);

    const items = await matchMeals(body, {
      excludeAllergens: body.excludeAllergens,
      requireTags: body.requireTags,
      mealType: body.mealType ?? null,
      limit: body.limit,
    });
    return { target: body, items };
  });

  /**
   * Search. `mode` picks the strategy:
   *   lexical  - pg_trgm only; exact, cheap, catches typos in stored names
   *   semantic - pgvector only; matches meaning, not spelling
   *   hybrid   - both, fused by reciprocal rank (the default)
   * Falls back to lexical automatically when pgvector is not installed.
   */
  app.get("/search", { preHandler: auth }, async (req) => {
    const { q, type, limit, mode } = z
      .object({
        q: z.string().trim().min(2),
        type: z.enum(["foods", "meals", "exercises"]).default("foods"),
        limit: z.coerce.number().min(1).max(50).default(10),
        mode: z.enum(["lexical", "semantic", "hybrid"]).default("hybrid"),
      })
      .parse(req.query);

    const vectorAvailable = await hasVector();
    const effective = vectorAvailable ? mode : "lexical";

    const items =
      effective === "lexical"
        ? await trigramSearch(type, q, limit)
        : effective === "semantic"
          ? await vectorSearch(type, q, limit)
          : await hybridSearch(type, q, limit);

    return {
      items,
      mode: effective,
      ...(vectorAvailable
        ? {}
        : { note: "pgvector is not installed; semantic ranking unavailable. See migrations/0003_pgvector.sql" }),
    };
  });
};
