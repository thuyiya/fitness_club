import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DailyLog } from '@/types';
import { zustandStorage } from './storage';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyLog(date: string): DailyLog {
  return {
    date,
    caloriesConsumed: 0,
    proteinG: 0,
    waterMl: 0,
    walkingMinutes: 0,
    workoutMinutes: 0,
    steps: 0,
    distanceKm: 0,
    sleepHours: 0,
  };
}

interface LogState {
  logs: Record<string, DailyLog>;
  today: () => DailyLog;
  addWater: (ml: number) => void;
  addMeal: (calories: number, proteinG: number) => void;
  addWalking: (minutes: number) => void;
  addWorkout: (minutes: number) => void;
  addDistance: (km: number) => void;
  setSteps: (steps: number) => void;
  setSleep: (hours: number) => void;
}

export const useLogStore = create<LogState>()(
  persist(
    (set, get) => ({
      logs: {},
      today: () => {
        const key = todayKey();
        return get().logs[key] ?? emptyLog(key);
      },
      addWater: (ml) => mutate(set, (l) => ({ ...l, waterMl: l.waterMl + ml })),
      addMeal: (calories, proteinG) =>
        mutate(set, (l) => ({
          ...l,
          caloriesConsumed: l.caloriesConsumed + calories,
          proteinG: l.proteinG + proteinG,
        })),
      addWalking: (minutes) =>
        mutate(set, (l) => ({ ...l, walkingMinutes: l.walkingMinutes + minutes })),
      addWorkout: (minutes) =>
        mutate(set, (l) => ({ ...l, workoutMinutes: l.workoutMinutes + minutes })),
      addDistance: (km) => mutate(set, (l) => ({ ...l, distanceKm: l.distanceKm + km })),
      setSteps: (steps) => mutate(set, (l) => ({ ...l, steps })),
      setSleep: (hours) => mutate(set, (l) => ({ ...l, sleepHours: hours })),
    }),
    {
      name: 'logs',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

function mutate(
  set: (fn: (s: LogState) => Partial<LogState>) => void,
  updater: (log: DailyLog) => DailyLog,
) {
  const key = todayKey();
  set((s) => {
    const current = s.logs[key] ?? emptyLog(key);
    return { logs: { ...s.logs, [key]: updater(current) } };
  });
}
