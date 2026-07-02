/**
 * AI meal generator: assembles a day of meals that hits the calorie target
 * while respecting the user's diet and allergies, scaling portions to fit.
 */
import { DietType, GroceryCategory, GroceryItem, Meal, MealType } from '@/types';
import { MEAL_LIBRARY } from '@/data/meals';

const SPLIT: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};

export interface GenerateOptions {
  calories: number;
  diet: DietType;
  allergies: string[];
  seed?: number;
}

function matchesDiet(meal: Meal, diet: DietType): boolean {
  if (diet === 'balanced') return true;
  return meal.tags.includes(diet);
}

function hasAllergen(meal: Meal, allergies: string[]): boolean {
  if (allergies.length === 0) return false;
  const lower = allergies.map((a) => a.toLowerCase().trim()).filter(Boolean);
  return meal.ingredients.some((ing) =>
    lower.some((a) => ing.name.toLowerCase().includes(a)),
  );
}

/** Scale a meal's macros to a target calorie count. */
export function scaleMeal(meal: Meal, targetCalories: number): Meal {
  const factor = Math.max(0.4, Math.min(2.2, targetCalories / meal.calories));
  const r = (n: number) => Math.round(n * factor);
  return {
    ...meal,
    calories: r(meal.calories),
    proteinG: r(meal.proteinG),
    carbsG: r(meal.carbsG),
    fatG: r(meal.fatG),
  };
}

function pick(candidates: Meal[], seed: number): Meal | null {
  if (candidates.length === 0) return null;
  return candidates[seed % candidates.length] ?? null;
}

/** Generate a full day of scaled meals. */
export function generateDay(opts: GenerateOptions): Meal[] {
  const seed = opts.seed ?? 0;
  const types: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  return types
    .map((type, i) => {
      const eligible = MEAL_LIBRARY.filter(
        (m) => m.type === type && matchesDiet(m, opts.diet) && !hasAllergen(m, opts.allergies),
      );
      const fallback = MEAL_LIBRARY.filter((m) => m.type === type);
      const chosen = pick(eligible.length ? eligible : fallback, seed + i);
      if (!chosen) return null;
      return scaleMeal(chosen, opts.calories * SPLIT[type]);
    })
    .filter((m): m is Meal => m !== null);
}

/** Regenerate a single meal slot with a fresh pick. */
export function regenerateMeal(
  current: Meal,
  opts: GenerateOptions,
): Meal {
  const eligible = MEAL_LIBRARY.filter(
    (m) =>
      m.type === current.type &&
      m.id !== current.id &&
      matchesDiet(m, opts.diet) &&
      !hasAllergen(m, opts.allergies),
  );
  const chosen = pick(eligible.length ? eligible : [current], (opts.seed ?? 0) + 1);
  return scaleMeal(chosen ?? current, current.calories);
}

const CATEGORY_ORDER: GroceryCategory[] = [
  'vegetables',
  'fruits',
  'protein',
  'dairy',
  'grains',
  'spices',
  'other',
];

/** Build a de-duplicated grocery list grouped by category from a set of meals. */
export function buildGroceryList(meals: Meal[]): GroceryItem[] {
  const map = new Map<string, GroceryItem>();
  meals.forEach((meal) => {
    meal.ingredients.forEach((ing) => {
      const key = ing.name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: ing.name,
          amount: ing.amount,
          category: ing.category,
          checked: false,
        });
      }
    });
  });
  return Array.from(map.values()).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  );
}

export const GROCERY_LABELS: Record<GroceryCategory, string> = {
  vegetables: 'Vegetables',
  fruits: 'Fruits',
  protein: 'Protein',
  dairy: 'Dairy',
  grains: 'Grains',
  spices: 'Spices',
  other: 'Other',
};
