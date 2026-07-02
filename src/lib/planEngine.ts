/**
 * The "AI Engine": turns a user profile into a complete personalized plan —
 * daily targets, health metrics, and a week-by-week weight timeline. Also
 * derives coaching insights and motivational advice from the same inputs.
 */
import {
  DailyTargets,
  Insight,
  Plan,
  UserProfile,
} from '@/types';
import {
  clamp,
  computeHealthMetrics,
  computeMacros,
  predictWeight,
  targetCalories,
} from './calculations';

export function buildPlan(profile: UserProfile): Plan {
  const metrics = computeHealthMetrics(profile);
  const calories = targetCalories(profile, metrics.tdee);
  const macros = computeMacros(profile, calories);

  const walkingMinutes = clamp(Math.round(profile.dailySteps / 100), 20, 120);
  const workoutMinutes = profile.workoutDaysPerWeek >= 3 ? 45 : 30;
  const waterMl = Math.max(profile.waterIntakeMl, Math.round(profile.weightKg * 33));

  const targets: DailyTargets = {
    ...macros,
    waterMl,
    walkingMinutes,
    workoutMinutes,
    steps: Math.max(profile.dailySteps, 8000),
  };

  const prediction = predictWeight(profile, calories, profile.createdAt || Date.now());

  return { targets, metrics, prediction, generatedAt: Date.now() };
}

/** Human-readable coaching lines shown on the dashboard AI card. */
export function coachHeadlines(profile: UserProfile, plan: Plan): string[] {
  const finish = new Date(plan.prediction.finishDate);
  const finishStr = finish.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  const dir = profile.goal === 'gain' ? 'gain' : 'lose';
  const diff = Math.abs(profile.weightKg - profile.targetWeightKg).toFixed(1);

  const lines = [
    `If you keep eating ${plan.targets.calories} kcal/day and walking ${plan.targets.walkingMinutes} minutes, you'll likely reach your goal by ${finishStr}.`,
    `You're on track to ${dir} ${diff}kg in about ${plan.prediction.totalWeeks} weeks — steady and sustainable.`,
    `Hit ${plan.targets.proteinG}g protein today to protect lean muscle while you ${dir} weight.`,
    `${plan.targets.waterMl}ml of water keeps your metabolism firing. You've got this. 💪`,
  ];
  return lines;
}

/** Generate personalized insights from the profile + plan. */
export function buildInsights(profile: UserProfile, plan: Plan): Insight[] {
  const insights: Insight[] = [];

  if (plan.metrics.bmi >= 25) {
    insights.push({
      id: 'bmi',
      icon: '📉',
      title: 'A gentle calorie deficit will help',
      detail: `Your BMI is ${plan.metrics.bmi}. Sticking to ${plan.targets.calories} kcal/day moves you toward a healthy range.`,
      tone: 'neutral',
    });
  }

  if (profile.medicalConditions.includes('high_cholesterol')) {
    insights.push({
      id: 'chol',
      icon: '🫀',
      title: 'Reduce saturated fat',
      detail: 'Swap butter for olive oil and prioritize oily fish to help improve cholesterol.',
      tone: 'warning',
    });
  }
  if (profile.medicalConditions.includes('diabetes')) {
    insights.push({
      id: 'glucose',
      icon: '🩸',
      title: 'Walk after dinner',
      detail: 'A 15-minute walk after meals meaningfully improves glucose control.',
      tone: 'warning',
    });
  }
  if (profile.medicalConditions.includes('high_blood_pressure')) {
    insights.push({
      id: 'bp',
      icon: '🧂',
      title: 'Watch your sodium',
      detail: 'Keeping sodium under 2g/day supports healthier blood pressure.',
      tone: 'warning',
    });
  }

  if (profile.sleepHours < 7) {
    insights.push({
      id: 'sleep',
      icon: '😴',
      title: 'Sleep 30 minutes longer',
      detail: `You average ${profile.sleepHours}h. More sleep lowers cravings and improves recovery.`,
      tone: 'warning',
    });
  }

  if (profile.stressLevel === 'high') {
    insights.push({
      id: 'stress',
      icon: '🧘',
      title: 'Manage stress to curb cortisol',
      detail: 'High stress raises cortisol, which can slow fat loss. Try 5 minutes of breathing.',
      tone: 'warning',
    });
  }

  if (plan.targets.proteinG > 0) {
    insights.push({
      id: 'protein',
      icon: '🍗',
      title: 'Protein is your priority',
      detail: `Aim for ${plan.targets.proteinG}g/day to keep you full and preserve muscle.`,
      tone: 'positive',
    });
  }

  insights.push({
    id: 'fiber',
    icon: '🥦',
    title: 'Increase fibre to 30g/day',
    detail: 'Fibre improves digestion, satiety and long-term weight maintenance.',
    tone: 'neutral',
  });

  return insights;
}

/** Rotating messages for the AI loading screen. */
export const LOADING_MESSAGES = [
  'Analyzing metabolism…',
  'Calculating TDEE…',
  'Estimating body composition…',
  'Generating meal plan…',
  'Predicting weight timeline…',
  'Preparing workout…',
  'Building your AI coach…',
];
