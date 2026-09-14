/** Shared domain types for Nutrition + Fitness. */

export type Goal = 'lose' | 'gain' | 'maintain';
export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type TargetSpeed = 'safe' | 'balanced' | 'aggressive';
export type DietType =
  | 'balanced'
  | 'high_protein'
  | 'keto'
  | 'vegetarian'
  | 'vegan'
  | 'mediterranean'
  | 'low_carb';
export type StressLevel = 'low' | 'moderate' | 'high';
export type MeasurementUnit = 'metric' | 'imperial';

export type MedicalCondition =
  | 'thyroid'
  | 'diabetes'
  | 'high_cholesterol'
  | 'high_blood_pressure'
  | 'none';

export interface UserProfile {
  name: string;
  goal: Goal;
  gender: Gender;
  age: number;
  /** Height in centimeters (canonical). */
  heightCm: number;
  /** Current weight in kilograms (canonical). */
  weightKg: number;
  /** Target weight in kilograms. */
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  bodyFatPct?: number;
  muscleMassKg?: number;
  dailySteps: number;
  workoutDaysPerWeek: number;
  diet: DietType;
  allergies: string[];
  medicalConditions: MedicalCondition[];
  sleepHours: number;
  stressLevel: StressLevel;
  waterIntakeMl: number;
  targetSpeed: TargetSpeed;
  units: MeasurementUnit;
  createdAt: number;
}

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface HealthMetrics {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  bodyFatPct: number;
  idealWeightKg: number;
  waistRatio?: number;
  visceralFat?: number;
}

export interface DailyTargets extends MacroTargets {
  waterMl: number;
  walkingMinutes: number;
  workoutMinutes: number;
  steps: number;
}

export interface WeeklyMilestone {
  week: number;
  expectedWeightKg: number;
  calories: number;
  workoutMinutes: number;
  walkingMinutes: number;
  date: number;
}

export interface WeightPrediction {
  milestones: WeeklyMilestone[];
  finishDate: number;
  daysRemaining: number;
  weeklyRateKg: number;
  totalWeeks: number;
}

export interface Plan {
  targets: DailyTargets;
  metrics: HealthMetrics;
  prediction: WeightPrediction;
  generatedAt: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Ingredient {
  name: string;
  amount: string;
  category: GroceryCategory;
}

export interface Meal {
  id: string;
  type: MealType;
  name: string;
  emoji: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  prepMinutes: number;
  recipe: string[];
  ingredients: Ingredient[];
  substitutions: string[];
  tags: DietType[];
}

export type GroceryCategory =
  | 'vegetables'
  | 'fruits'
  | 'protein'
  | 'dairy'
  | 'grains'
  | 'spices'
  | 'other';

export interface GroceryItem {
  id: string;
  name: string;
  amount: string;
  category: GroceryCategory;
  checked: boolean;
}

export type WorkoutCategory =
  | 'walking'
  | 'running'
  | 'gym'
  | 'home'
  | 'hiit'
  | 'yoga'
  | 'stretching';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
}

export interface Workout {
  id: string;
  category: WorkoutCategory;
  name: string;
  emoji: string;
  durationMinutes: number;
  caloriesBurned: number;
  difficulty: Difficulty;
  exercises: Exercise[];
  description: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progress: number; // 0..1
}

export interface WeightEntry {
  date: number;
  weightKg: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  caloriesConsumed: number;
  proteinG: number;
  waterMl: number;
  walkingMinutes: number;
  workoutMinutes: number;
  steps: number;
  /** Distance covered from walking/running, in kilometers. */
  distanceKm: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  text: string;
  createdAt: number;
}

export interface Insight {
  id: string;
  icon: string;
  title: string;
  detail: string;
  tone: 'positive' | 'neutral' | 'warning';
}
