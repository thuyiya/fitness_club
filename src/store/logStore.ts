import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DailyLog, SleepDetails, SleepNight } from '@/types';
import { zustandStorage } from './storage';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Hours between a bed time and a wake time ("HH:MM"), wrapping past midnight. */
export function sleepHoursBetween(bedTime: string, wakeTime: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const diff = (toMin(wakeTime) - toMin(bedTime) + 1440) % 1440;
  return Math.round((diff / 60) * 10) / 10;
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
  /** Merge richer sleep fields into today's log; derives sleepHours from
   * bedTime + wakeTime when both are present. */
  setSleepDetails: (details: SleepDetails) => void;
  /** Recent nights (most recent last) that have sleep data, for trend views. */
  sleepHistory: (days: number) => SleepNight[];
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
      setSleepDetails: (details) =>
        mutate(set, (l) => {
          const next = { ...l, ...details };
          if (next.bedTime && next.wakeTime) {
            next.sleepHours = sleepHoursBetween(next.bedTime, next.wakeTime);
          }
          return next;
        }),
      sleepHistory: (days) => {
        const logs = get().logs;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (days - 1));
        const cutoffKey = cutoff.toISOString().slice(0, 10);
        return Object.values(logs)
          .filter(
            (l) =>
              l.date >= cutoffKey &&
              (l.sleepHours > 0 ||
                l.sleepQuality != null ||
                l.bedTime != null ||
                l.wakeTime != null),
          )
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((l) => ({
            date: l.date,
            sleepHours: l.sleepHours,
            sleepQuality: l.sleepQuality,
            bedTime: l.bedTime,
            wakeTime: l.wakeTime,
            sleepNote: l.sleepNote,
          }));
      },
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
