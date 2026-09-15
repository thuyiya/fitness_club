import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { foodSource, mealType } from "./enums.js";
import { users } from "./identity.js";

/**
 * The searchable food database behind C34/C35 and M18.
 *
 * Bulk rows come from Open Food Facts (free, open licence, ships photo URLs), so
 * `imageUrl` points at their CDN rather than our storage --- that is what keeps the
 * image bill at zero. Coach-authored entries are source='custom' (C37).
 *
 * All macros are per `servingSize` of `servingUnit`, NOT per 100g, so that a logged
 * quantity is a straight multiply with no unit conversion at read time.
 */
export const foods = pgTable(
  "foods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: foodSource("source").notNull().default("custom"),
    /** Open Food Facts barcode, so re-imports upsert instead of duplicating. */
    externalId: text("external_id"),
    ownerCoachId: uuid("owner_coach_id").references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug"),
    name: text("name").notNull(),
    brand: text("brand"),
    /** Vocabulary in seed/reference; `group` is the browse axis. */
    group: text("group"),
    imageUrl: text("image_url"),
    servingSize: numeric("serving_size", { precision: 8, scale: 2 }).notNull().default("100"),
    servingUnit: text("serving_unit").notNull().default("g"),
    calories: numeric("calories", { precision: 8, scale: 2 }).notNull().default("0"),
    proteinG: numeric("protein_g", { precision: 8, scale: 2 }).notNull().default("0"),
    carbsG: numeric("carbs_g", { precision: 8, scale: 2 }).notNull().default("0"),
    fatG: numeric("fat_g", { precision: 8, scale: 2 }).notNull().default("0"),
    saturatedFatG: numeric("saturated_fat_g", { precision: 8, scale: 2 }),
    fiberG: numeric("fiber_g", { precision: 8, scale: 2 }),
    sugarG: numeric("sugar_g", { precision: 8, scale: 2 }),
    sodiumMg: numeric("sodium_mg", { precision: 8, scale: 2 }),
    /**
     * Safety-relevant: what the SOURCE declares, never inferred. A food that
     * declares an allergen must not also carry the matching "free of" tag.
     */
    allergens: text("allergens").array().notNull().default([]),
    /**
     * `foodClasses` is the composition (meat, dairy, legumes); `dietaryTags` is
     * computed from it, so a meal cannot be mislabelled vegan while containing
     * butter. Never hand-type dietaryTags without checking foodClasses.
     */
    foodClasses: text("food_classes").array().notNull().default([]),
    dietaryTags: text("dietary_tags").array().notNull().default([]),
    isVerified: boolean("is_verified").notNull().default(false),
    /** all-MiniLM-L6-v2 embedding of name + brand + group, for semantic search. */
    embedding: vector("embedding", { dimensions: 384 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("foods_external_unique").on(t.source, t.externalId),
    index("foods_owner_idx").on(t.ownerCoachId),
    // Replace with a GIN trigram index once pg_trgm is enabled --- search is the
    // hot path on C34 and a btree on name only helps prefix matches.
    index("foods_name_idx").on(t.name),
    uniqueIndex("foods_slug_unique").on(t.slug),
    index("foods_group_idx").on(t.group),
    // GIN over the arrays so "exclude anything with peanuts" is an index scan.
    index("foods_allergens_idx").using("gin", t.allergens),
    index("foods_dietary_idx").using("gin", t.dietaryTags),
  ],
);

/**
 * A composed meal from C36 meal builder. Macros are denormalised caches of the
 * sum over mealIngredients: recompute on ingredient write, never trust on read
 * for billing-grade numbers.
 */
export const meals = pgTable(
  "meals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug"),
    /**
     * NULL means a platform catalog meal, matching the pattern already used by
     * foods and exercises. Without this, seeded meals have no owner to belong to.
     */
    ownerCoachId: uuid("owner_coach_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    photoUrl: text("photo_url"),
    defaultMealType: mealType("default_meal_type"),
    prepMinutes: integer("prep_minutes"),
    /** Computed from the ingredients' foodClasses --- never hand-typed. */
    tags: text("tags").array().notNull().default([]),
    servings: numeric("servings", { precision: 5, scale: 2 }).notNull().default("1"),
    notes: text("notes"),
    isTemplate: boolean("is_template").notNull().default(false),
    calories: numeric("calories", { precision: 8, scale: 2 }).notNull().default("0"),
    proteinG: numeric("protein_g", { precision: 8, scale: 2 }).notNull().default("0"),
    carbsG: numeric("carbs_g", { precision: 8, scale: 2 }).notNull().default("0"),
    fatG: numeric("fat_g", { precision: 8, scale: 2 }).notNull().default("0"),
    /**
     * Union of every ingredient's allergens, maintained on ingredient write.
     * Denormalised so an allergen exclusion is one index scan, not a join --- a
     * filter that must never be approximate.
     */
    allergens: text("allergens").array().notNull().default([]),
    /** all-MiniLM-L6-v2 embedding of name + tags + ingredient names. */
    embedding: vector("embedding", { dimensions: 384 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("meals_owner_idx").on(t.ownerCoachId),
    uniqueIndex("meals_slug_unique").on(t.slug),
    index("meals_allergens_idx").using("gin", t.allergens),
    index("meals_tags_idx").using("gin", t.tags),
    // Macro-match ordering scans these; see api/src/routes/recommend.ts.
    index("meals_macro_idx").on(t.calories, t.proteinG),
  ],
);

export const mealIngredients = pgTable(
  "meal_ingredients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mealId: uuid("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "restrict" }),
    quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull(),
    unit: text("unit").notNull().default("g"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("meal_ingredients_meal_idx").on(t.mealId, t.position)],
);
