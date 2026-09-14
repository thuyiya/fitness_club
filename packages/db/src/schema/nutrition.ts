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
} from "drizzle-orm/pg-core";
import { foodSource, mealType } from "./enums";
import { users } from "./identity";

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
    name: text("name").notNull(),
    brand: text("brand"),
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
    isVerified: boolean("is_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("foods_external_unique").on(t.source, t.externalId),
    index("foods_owner_idx").on(t.ownerCoachId),
    // Replace with a GIN trigram index once pg_trgm is enabled --- search is the
    // hot path on C34 and a btree on name only helps prefix matches.
    index("foods_name_idx").on(t.name),
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
    ownerCoachId: uuid("owner_coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    photoUrl: text("photo_url"),
    defaultMealType: mealType("default_meal_type"),
    servings: numeric("servings", { precision: 5, scale: 2 }).notNull().default("1"),
    notes: text("notes"),
    isTemplate: boolean("is_template").notNull().default(false),
    calories: numeric("calories", { precision: 8, scale: 2 }).notNull().default("0"),
    proteinG: numeric("protein_g", { precision: 8, scale: 2 }).notNull().default("0"),
    carbsG: numeric("carbs_g", { precision: 8, scale: 2 }).notNull().default("0"),
    fatG: numeric("fat_g", { precision: 8, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("meals_owner_idx").on(t.ownerCoachId)],
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
