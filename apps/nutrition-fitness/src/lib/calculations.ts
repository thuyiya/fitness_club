/**
 * Evidence-based fitness calculations.
 *
 * Formulas:
 *  - BMR: Mifflin-St Jeor (falls back to Katch-McArdle when body fat is known).
 *  - TDEE: BMR x activity multiplier, with dynamic metabolic adaptation.
 *  - Macros: goal & diet aware protein-first split.
 *  - Body fat: Deurenberg estimation from BMI/age/gender.
 */

import {
  ActivityLevel,
  DietType,
  Gender,
  Goal,
  HealthMetrics,
  MacroTargets,
  TargetSpeed,
  UserProfile,
  WeeklyMilestone,
  WeightPrediction,
} from '@/types';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** kcal burned per kg of body change (approx 7700 kcal per kg of fat). */
export const KCAL_PER_KG = 7700;

/** Weekly weight-change fraction of body weight for each pace. */
export const SPEED_WEEKLY_FRACTION: Record<TargetSpeed, number> = {
  safe: 0.005,
  balanced: 0.0075,
  aggressive: 0.01,
};

export function calcBMI(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  if (m <= 0) return 0;
  return round(weightKg / (m * m), 1);
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Healthy';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

/** Mifflin-St Jeor BMR. */
export function calcBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const genderOffset = gender === 'male' ? 5 : gender === 'female' ? -161 : -78;
  return round(base + genderOffset);
}

/** Katch-McArdle BMR — more accurate when lean body mass is known. */
export function calcBMRKatch(weightKg: number, bodyFatPct: number): number {
  const leanMass = weightKg * (1 - bodyFatPct / 100);
  return round(370 + 21.6 * leanMass);
}

export function calcTDEE(bmr: number, activity: ActivityLevel): number {
  return round(bmr * ACTIVITY_MULTIPLIERS[activity]);
}

/**
 * Dynamic metabolic adaptation: as the body loses weight, TDEE drops because a
 * lighter body burns fewer calories. Recomputes TDEE for a projected weight.
 */
export function adaptedTDEE(profile: UserProfile, projectedWeightKg: number): number {
  const bmr = profile.bodyFatPct
    ? calcBMRKatch(projectedWeightKg, projectedBodyFat(profile, projectedWeightKg))
    : calcBMR(projectedWeightKg, profile.heightCm, profile.age, profile.gender);
  return calcTDEE(bmr, profile.activityLevel);
}

/** Deurenberg body-fat estimate. */
export function estimateBodyFat(
  bmi: number,
  age: number,
  gender: Gender,
): number {
  const sex = gender === 'male' ? 1 : 0;
  const bf = 1.2 * bmi + 0.23 * age - 10.8 * sex - 5.4;
  return round(clamp(bf, 3, 60), 1);
}

function projectedBodyFat(profile: UserProfile, weightKg: number): number {
  // Assume ~75% of lost/gained weight affects fat mass.
  const start = profile.bodyFatPct ?? estimateBodyFat(
    calcBMI(profile.weightKg, profile.heightCm),
    profile.age,
    profile.gender,
  );
  const startFatKg = (start / 100) * profile.weightKg;
  const delta = (weightKg - profile.weightKg) * 0.75;
  const newFatKg = clamp(startFatKg + delta, 1, weightKg);
  return round((newFatKg / weightKg) * 100, 1);
}

/** Robinson ideal weight formula. */
export function idealWeight(heightCm: number, gender: Gender): number {
  const inchesOver5ft = Math.max(0, (heightCm - 152.4) / 2.54);
  const base = gender === 'male' ? 52 : 49;
  const perInch = gender === 'male' ? 1.9 : 1.7;
  return round(base + perInch * inchesOver5ft, 1);
}

export function computeHealthMetrics(profile: UserProfile): HealthMetrics {
  const bmi = calcBMI(profile.weightKg, profile.heightCm);
  const bodyFatPct =
    profile.bodyFatPct ?? estimateBodyFat(bmi, profile.age, profile.gender);
  const bmr = profile.bodyFatPct
    ? calcBMRKatch(profile.weightKg, profile.bodyFatPct)
    : calcBMR(profile.weightKg, profile.heightCm, profile.age, profile.gender);
  const tdee = calcTDEE(bmr, profile.activityLevel);

  return {
    bmi,
    bmiCategory: bmiCategory(bmi),
    bmr,
    tdee,
    bodyFatPct,
    idealWeightKg: idealWeight(profile.heightCm, profile.gender),
    waistRatio: round(0.45 + bodyFatPct / 200, 2),
    visceralFat: round(clamp(bodyFatPct / 4, 1, 20)),
  };
}

/** Daily calorie target given the goal, pace, and adaptation. */
export function targetCalories(profile: UserProfile, tdee: number): number {
  if (profile.goal === 'maintain') return tdee;

  const weeklyKg = profile.weightKg * SPEED_WEEKLY_FRACTION[profile.targetSpeed];
  const dailyDelta = (weeklyKg * KCAL_PER_KG) / 7;

  const raw = profile.goal === 'lose' ? tdee - dailyDelta : tdee + dailyDelta;
  // Never drop below a safe floor.
  const floor = profile.gender === 'male' ? 1500 : 1200;
  return round(Math.max(floor, raw), 10);
}

/** Protein-first macro split, tuned per diet type. */
export function computeMacros(
  profile: UserProfile,
  calories: number,
): MacroTargets {
  const proteinPerKg = proteinFactor(profile.goal, profile.diet);
  const proteinG = round(profile.weightKg * proteinPerKg);

  const fatRatio = fatRatioForDiet(profile.diet);
  const fatCalories = calories * fatRatio;
  const fatG = round(fatCalories / 9);

  const proteinCalories = proteinG * 4;
  const carbCalories = Math.max(0, calories - proteinCalories - fatCalories);
  const carbsG = round(carbCalories / 4);

  return { calories: round(calories, 10), proteinG, carbsG, fatG };
}

function proteinFactor(goal: Goal, diet: DietType): number {
  let base = goal === 'lose' ? 2.0 : goal === 'gain' ? 1.8 : 1.6;
  if (diet === 'high_protein') base += 0.2;
  if (diet === 'keto' || diet === 'low_carb') base += 0.1;
  return base;
}

function fatRatioForDiet(diet: DietType): number {
  switch (diet) {
    case 'keto':
      return 0.7;
    case 'low_carb':
      return 0.4;
    case 'mediterranean':
      return 0.35;
    default:
      return 0.28;
  }
}

/** Calories burned walking. MET-based. */
export function walkingCalories(minutes: number, weightKg: number, pace = 3.5): number {
  const met = pace < 3 ? 2.8 : pace < 4 ? 3.5 : 5.0;
  return round((met * 3.5 * weightKg) / 200 * minutes);
}

/** Calories burned running. */
export function runningCalories(minutes: number, weightKg: number, kmh = 9): number {
  const met = kmh < 8 ? 8.3 : kmh < 10 ? 9.8 : 11.5;
  return round((met * 3.5 * weightKg) / 200 * minutes);
}

/**
 * Weekly weight-loss/gain prediction with metabolic adaptation applied each
 * week. Produces milestones until the target is reached (capped at 104 weeks).
 */
export function predictWeight(
  profile: UserProfile,
  dailyCalories: number,
  startDate: number,
): WeightPrediction {
  const milestones: WeeklyMilestone[] = [];
  const direction = profile.goal === 'gain' ? 1 : -1;
  let weight = profile.weightKg;
  const target = profile.targetWeightKg;
  const maxWeeks = 104;
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const walkingMinutes = clamp(Math.round(profile.dailySteps / 100), 20, 120);
  const workoutMinutes = profile.workoutDaysPerWeek >= 3 ? 45 : 30;

  let week = 0;
  const reached = () =>
    profile.goal === 'maintain'
      ? week >= 4
      : direction < 0
        ? weight <= target
        : weight >= target;

  while (!reached() && week < maxWeeks) {
    week += 1;
    const tdee = adaptedTDEE(profile, weight);
    const dailyDelta = tdee - dailyCalories; // positive => deficit
    const weeklyKg = (dailyDelta * 7) / KCAL_PER_KG;
    weight = weight - weeklyKg;

    // Clamp so we don't overshoot the target.
    if (direction < 0) weight = Math.max(target, weight);
    else weight = Math.min(target, weight);

    milestones.push({
      week,
      expectedWeightKg: round(weight, 1),
      calories: dailyCalories,
      workoutMinutes,
      walkingMinutes,
      date: startDate + week * weekMs,
    });
  }

  const totalWeeks = milestones.length;
  const finishDate = milestones[totalWeeks - 1]?.date ?? startDate;
  const weeklyRateKg =
    totalWeeks > 0 ? round(Math.abs(profile.weightKg - weight) / totalWeeks, 2) : 0;

  return {
    milestones,
    finishDate,
    daysRemaining: Math.max(0, Math.round((finishDate - startDate) / (24 * 60 * 60 * 1000))),
    weeklyRateKg,
    totalWeeks,
  };
}

// ---------- helpers ----------

export function round(n: number, decimals = 0): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function kgToLb(kg: number): number {
  return round(kg * 2.20462, 1);
}

export function lbToKg(lb: number): number {
  return round(lb / 2.20462, 1);
}

export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalIn = cm / 2.54;
  return { ft: Math.floor(totalIn / 12), in: Math.round(totalIn % 12) };
}
