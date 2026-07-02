import {
  ACTIVITY_MULTIPLIERS,
  bmiCategory,
  calcBMI,
  calcBMR,
  calcTDEE,
  computeMacros,
  estimateBodyFat,
  idealWeight,
  predictWeight,
  targetCalories,
  walkingCalories,
} from '../calculations';
import { UserProfile } from '@/types';

const base: UserProfile = {
  name: 'Test',
  goal: 'lose',
  gender: 'male',
  age: 30,
  heightCm: 180,
  weightKg: 90,
  targetWeightKg: 80,
  activityLevel: 'moderate',
  dailySteps: 8000,
  workoutDaysPerWeek: 4,
  diet: 'balanced',
  allergies: [],
  medicalConditions: ['none'],
  sleepHours: 7,
  stressLevel: 'moderate',
  waterIntakeMl: 2500,
  targetSpeed: 'balanced',
  units: 'metric',
  createdAt: 0,
};

describe('BMI', () => {
  it('computes BMI correctly', () => {
    expect(calcBMI(90, 180)).toBeCloseTo(27.8, 1);
  });
  it('categorizes BMI', () => {
    expect(bmiCategory(18)).toBe('Underweight');
    expect(bmiCategory(22)).toBe('Healthy');
    expect(bmiCategory(27)).toBe('Overweight');
    expect(bmiCategory(32)).toBe('Obese');
  });
});

describe('BMR (Mifflin-St Jeor)', () => {
  it('matches known value for a male', () => {
    // 10*90 + 6.25*180 - 5*30 + 5 = 1880
    expect(calcBMR(90, 180, 30, 'male')).toBe(1880);
  });
  it('applies female offset', () => {
    expect(calcBMR(90, 180, 30, 'female')).toBe(1880 - 166);
  });
});

describe('TDEE', () => {
  it('applies activity multiplier', () => {
    expect(calcTDEE(2000, 'moderate')).toBe(Math.round(2000 * ACTIVITY_MULTIPLIERS.moderate));
  });
});

describe('macros', () => {
  it('protein-first split hits the calorie total approximately', () => {
    const macros = computeMacros(base, 2000);
    const kcal = macros.proteinG * 4 + macros.carbsG * 4 + macros.fatG * 9;
    expect(Math.abs(kcal - 2000)).toBeLessThan(60);
    expect(macros.proteinG).toBeGreaterThan(100);
  });
});

describe('target calories', () => {
  it('creates a deficit for weight loss', () => {
    const tdee = 2800;
    expect(targetCalories(base, tdee)).toBeLessThan(tdee);
  });
  it('never drops below the male floor', () => {
    const tiny = { ...base, weightKg: 60, targetSpeed: 'aggressive' as const };
    expect(targetCalories(tiny, 1600)).toBeGreaterThanOrEqual(1500);
  });
  it('returns TDEE for maintenance', () => {
    expect(targetCalories({ ...base, goal: 'maintain' }, 2500)).toBe(2500);
  });
});

describe('body fat + ideal weight', () => {
  it('estimates body fat within range', () => {
    const bf = estimateBodyFat(27.8, 30, 'male');
    expect(bf).toBeGreaterThan(10);
    expect(bf).toBeLessThan(40);
  });
  it('computes an ideal weight', () => {
    expect(idealWeight(180, 'male')).toBeGreaterThan(60);
  });
});

describe('walking calories', () => {
  it('scales with time and weight', () => {
    expect(walkingCalories(60, 90)).toBeGreaterThan(walkingCalories(30, 90));
  });
});

describe('weight prediction', () => {
  it('produces a decreasing timeline that reaches the target', () => {
    const cals = targetCalories(base, calcTDEE(calcBMR(90, 180, 30, 'male'), 'moderate'));
    const pred = predictWeight(base, cals, 0);
    expect(pred.milestones.length).toBeGreaterThan(0);
    const last = pred.milestones[pred.milestones.length - 1];
    expect(last.expectedWeightKg).toBeLessThanOrEqual(base.weightKg);
    expect(last.expectedWeightKg).toBeGreaterThanOrEqual(base.targetWeightKg - 0.5);
    expect(pred.daysRemaining).toBeGreaterThan(0);
  });
  it('caps at 104 weeks', () => {
    // Impossible target with tiny deficit still terminates.
    const stubborn = { ...base, targetWeightKg: 5 };
    const pred = predictWeight(stubborn, 2000, 0);
    expect(pred.totalWeeks).toBeLessThanOrEqual(104);
  });
});
