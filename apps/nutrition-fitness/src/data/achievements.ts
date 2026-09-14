import { Achievement, WeightEntry } from '@/types';

interface AchievementContext {
  weightHistory: WeightEntry[];
  totalWalkingKm: number;
  streakDays: number;
  proteinDaysHit: number;
  waterDaysHit: number;
  workoutsCompleted: number;
}

/** Derive achievement unlock state + progress from user activity. */
export function computeAchievements(ctx: AchievementContext): Achievement[] {
  const start = ctx.weightHistory[0]?.weightKg ?? 0;
  const current = ctx.weightHistory[ctx.weightHistory.length - 1]?.weightKg ?? start;
  const lost = Math.max(0, start - current);

  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

  return [
    badge('first_workout', 'First Workout', 'Complete your first session', '🎯', clamp01(ctx.workoutsCompleted / 1)),
    badge('lost_1kg', 'Lost 1kg', 'Drop your first kilogram', '🥉', clamp01(lost / 1)),
    badge('lost_5kg', 'Lost 5kg', 'Reach a 5kg milestone', '🥈', clamp01(lost / 5)),
    badge('walk_100km', '100km Walked', 'Walk a cumulative 100km', '👟', clamp01(ctx.totalWalkingKm / 100)),
    badge('streak_30', '30 Day Streak', 'Log activity 30 days in a row', '🔥', clamp01(ctx.streakDays / 30)),
    badge('days_100', '100 Days', 'Stay consistent for 100 days', '💯', clamp01(ctx.streakDays / 100)),
    badge('protein_master', 'Protein Master', 'Hit protein goal 20 times', '🍗', clamp01(ctx.proteinDaysHit / 20)),
    badge('hydration_hero', 'Hydration Hero', 'Hit water goal 20 times', '💧', clamp01(ctx.waterDaysHit / 20)),
    badge('elite_athlete', 'Elite Athlete', 'Complete 50 workouts', '🏆', clamp01(ctx.workoutsCompleted / 50)),
  ];
}

function badge(
  id: string,
  title: string,
  description: string,
  emoji: string,
  progress: number,
): Achievement {
  return { id, title, description, emoji, progress, unlocked: progress >= 1 };
}
