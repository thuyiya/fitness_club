import {
  boolean,
  date,
  index,
  integer,
  jsonb,
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
 * Bulk rows come from two providers. Open Food Facts (free, open licence) ships
 * photo URLs, so `imageUrl` points at their CDN rather than our storage --- that is
 * what keeps the image bill at zero. USDA FoodData Central ships no images but is
 * the only source with a real micronutrient panel, so it fills `micronutrients`.
 * Coach-authored entries are source='custom' (C37).
 *
 * All macros are per `servingSize` of `servingUnit`, NOT per 100g, so that a logged
 * quantity is a straight multiply with no unit conversion at read time.
 */
export const foods = pgTable(
  "foods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: foodSource("source").notNull().default("custom"),
    /**
     * The provider's own key --- an Open Food Facts barcode, or a USDA fdc_id ---
     * so re-imports upsert instead of duplicating. Unique per (source, externalId).
     */
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
     * Everything past the eight macros above, per `servingSize` like they are:
     * { "iron_mg": 2.3, "vitamin_d_ug": 0.4, ... }. The slug carries the unit so
     * a value can never be read against the wrong scale. Keys are defined by the
     * `nutrients` table, which also holds the label and display order.
     *
     * jsonb rather than a child table because a panel is always read whole ---
     * one row fetch instead of a join against 27M nutrient rows.
     */
    micronutrients: jsonb("micronutrients").$type<Record<string, number>>(),
    /** Which USDA tier this came from; NULL for every other source. */
    usdaDataType: text("usda_data_type"),
    /** The provider's own category string, kept verbatim next to our `group`. */
    usdaCategory: text("usda_category"),
    barcode: text("barcode"),
    /** The raw ingredient statement, as printed. The basis for allergensDerived. */
    ingredientsText: text("ingredients_text"),
    sourcePublishedAt: date("source_published_at"),
    /**
     * Safety-relevant: what the SOURCE declares, never inferred. A food that
     * declares an allergen must not also carry the matching "free of" tag.
     */
    allergens: text("allergens").array().notNull().default([]),
    /**
     * INFERRED, and deliberately not `allergens`. USDA publishes no structured
     * allergen field, only an ingredient statement, so this is what a parser
     * read out of `ingredientsText` --- good enough to warn a member, never good
     * enough to promise a food is free of something. Exclusion filters must keep
     * reading `allergens`; a parser miss here would otherwise read as "safe".
     */
    allergensDerived: text("allergens_derived").array().notNull().default([]),
    /** How allergensDerived was produced, so a parser change can re-derive. */
    allergenSource: text("allergen_source"),
    /**
     * FDA nutrient-content claims computed from the values ("excellent_source_of_fiber",
     * "low_sodium"). Pure arithmetic against the thresholds in `claimsBasis` ---
     * never hand-typed, never model-generated.
     */
    healthClaims: text("health_claims").array().notNull().default([]),
    /** The rule set healthClaims was computed under, e.g. FDA 21 CFR 101.54. */
    claimsBasis: text("claims_basis"),
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
    index("foods_allergens_derived_idx").using("gin", t.allergensDerived),
    index("foods_health_claims_idx").using("gin", t.healthClaims),
    index("foods_usda_data_type_idx").on(t.usdaDataType),
    // Partial: only USDA branded rows carry a barcode, ~6% of the table.
    index("foods_barcode_idx").on(t.barcode),
    // jsonb_path_ops --- we ask "contains nutrient X above Y", never "what keys
    // exist", and it builds a smaller index than the default opclass.
    index("foods_micronutrients_idx").using("gin", t.micronutrients),
  ],
);

/**
 * The nutrient dictionary behind `foods.micronutrients`. Seeded from USDA's
 * nutrient.csv, so `usdaId` is their id and `rank` their display order --- which
 * is what makes a rendered panel read like a Nutrition Facts label rather than
 * an alphabetical dump.
 */
export const nutrients = pgTable(
  "nutrients",
  {
    usdaId: integer("usda_id").primaryKey(),
    /** The key used in `foods.micronutrients`; carries the unit (iron_mg). */
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    rank: numeric("rank", { precision: 10, scale: 1 }),
    /** FDA 2016 adult Daily Value in `unit`; NULL where the nutrient has none. */
    dailyValue: numeric("daily_value", { precision: 12, scale: 4 }),
    /** True for the eight that live in their own columns on `foods`. */
    isMacro: boolean("is_macro").notNull().default(false),
  },
  (t) => [uniqueIndex("nutrients_slug_unique").on(t.slug)],
);

/**
 * Household measures --- "1 cup, chopped" -> 150 g. Without these a member can
 * only log in grams, which is not how anyone describes a portion.
 */
export const foodPortions = pgTable(
  "food_portions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    seqNum: integer("seq_num").notNull().default(0),
    amount: numeric("amount", { precision: 10, scale: 3 }),
    unit: text("unit"),
    description: text("description"),
    modifier: text("modifier"),
    gramWeight: numeric("gram_weight", { precision: 10, scale: 2 }).notNull(),
    /**
     * The serving printed on the package --- what a member means by "one
     * serving", and the basis every health claim on this food was tested against.
     */
    isLabelServing: boolean("is_label_serving").notNull().default(false),
  },
  (t) => [
    index("food_portions_food_idx").on(t.foodId, t.seqNum),
    uniqueIndex("food_portions_unique").on(t.foodId, t.seqNum, t.gramWeight),
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
