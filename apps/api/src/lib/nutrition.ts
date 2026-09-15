/**
 * The calculation rules the whole product agrees on. Kept in one place because
 * a coach app that computes a target one way on the server and another way in
 * the client loses the member's trust the first time the numbers disagree.
 */

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

export const PAL: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

/** Calorie delta applied to TDEE, as a fraction. */
export const GOAL_DELTA: Record<string, number> = {
  fat_loss: -0.2,
  maintain: 0,
  muscle_gain: 0.1,
  recomposition: -0.05,
  endurance: 0.05,
  general_health: 0,
};

/** Mifflin-St Jeor. Needs sex; there is no sex-neutral form of this equation. */
export function bmr(input: { weightKg: number; heightCm: number; age: number; sex: "male" | "female" }) {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return input.sex === "male" ? base + 5 : base - 161;
}

export function tdee(input: Parameters<typeof bmr>[0] & { activityLevel: string }) {
  return bmr(input) * (PAL[input.activityLevel] ?? PAL.sedentary!);
}

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  basis: "sport_profile" | "goal_type";
}

/**
 * When a member has a sport of focus, its g/kg prescriptions win: a cricketer
 * eats to a cricket profile even on a day they only cycled. Fat is whatever
 * energy is left after protein and carbohydrate are met, floored at 20% of
 * calories so the diet stays viable.
 */
export function macroTargets(args: {
  tdeeKcal: number;
  weightKg: number;
  goal: "lose" | "maintain" | "gain";
  goalType?: string | null;
  sport?: { carbsGPerKg: number; proteinGPerKg: number } | null;
}): MacroTargets {
  const delta = GOAL_DELTA[args.goalType ?? "maintain"] ?? 0;
  const calories = Math.round(args.tdeeKcal * (1 + delta));

  if (args.sport) {
    const proteinG = Math.round(args.sport.proteinGPerKg * args.weightKg);
    const carbsG = Math.round(args.sport.carbsGPerKg * args.weightKg);
    const used = proteinG * KCAL_PER_G.protein + carbsG * KCAL_PER_G.carbs;
    const minFatKcal = calories * 0.2;
    const fatG = Math.round(Math.max(calories - used, minFatKcal) / KCAL_PER_G.fat);
    return { calories, proteinG, carbsG, fatG, basis: "sport_profile" };
  }

  // No sport of focus: a conventional 30/40/30 split, protein-first.
  const proteinG = Math.round((calories * 0.3) / KCAL_PER_G.protein);
  const carbsG = Math.round((calories * 0.4) / KCAL_PER_G.carbs);
  const fatG = Math.round((calories * 0.3) / KCAL_PER_G.fat);
  return { calories, proteinG, carbsG, fatG, basis: "goal_type" };
}

/** Compendium formula. The single source of every calorie-burn number shown. */
export const activityKcal = (met: number, weightKg: number, minutes: number) =>
  Math.round((met * 3.5 * weightKg) / 200 * minutes);

/** seed/reference/hydration.json: 33 ml/kg, clamped to a sane daily range. */
export function hydrationTargetMl(weightKg: number, extra = 0) {
  return Math.round(Math.min(4000, Math.max(1500, weightKg * 33 + extra)));
}
