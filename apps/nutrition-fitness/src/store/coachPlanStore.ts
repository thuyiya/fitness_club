import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from './storage';

/**
 * Plans the coach has drafted and the user chose to keep. When you ask the coach
 * to "add this to my workout/meal plan", the coach's latest suggestion is saved
 * here and surfaced on the Workouts / Meals tabs under "From your coach".
 */
export interface CoachPlan {
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

type PlanKind = 'workout' | 'meal';

interface CoachPlanState {
  workout: CoachPlan[];
  meal: CoachPlan[];
  addPlan: (kind: PlanKind, plan: Omit<CoachPlan, 'id' | 'createdAt'>) => void;
  removePlan: (kind: PlanKind, id: string) => void;
}

let seq = 0;

export const useCoachPlanStore = create<CoachPlanState>()(
  persist(
    (set) => ({
      workout: [],
      meal: [],
      addPlan: (kind, plan) =>
        set((s) => {
          const entry: CoachPlan = { ...plan, id: `cp${Date.now()}_${seq++}`, createdAt: Date.now() };
          return kind === 'workout'
            ? { workout: [entry, ...s.workout] }
            : { meal: [entry, ...s.meal] };
        }),
      removePlan: (kind, id) =>
        set((s) =>
          kind === 'workout'
            ? { workout: s.workout.filter((p) => p.id !== id) }
            : { meal: s.meal.filter((p) => p.id !== id) },
        ),
    }),
    {
      name: 'coach-plans',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

/** Turn a coach's freeform plan message into a short, tidy title. */
export function planTitle(body: string, kind: PlanKind): string {
  const firstLine = body
    .split('\n')
    .map((l) => l.replace(/^[\s*#\-•\d.)]+/, '').trim())
    .find((l) => l.length > 0);
  if (firstLine && firstLine.length <= 48) return firstLine;
  if (firstLine) return firstLine.slice(0, 45).trimEnd() + '…';
  const date = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${kind === 'workout' ? 'Workout' : 'Meal'} plan · ${date}`;
}
