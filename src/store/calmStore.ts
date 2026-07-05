import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from './storage';

/**
 * Lightweight history of Calm activity so the Progress tab (in Calm focus) has
 * something real to show: breathing rounds and sessions over time.
 */
interface CalmState {
  /** Timestamps of every completed breathing round. */
  roundLog: number[];
  /** Timestamps of every session the user started. */
  sessionLog: number[];
  addRound: () => void;
  startSession: () => void;
}

export const useCalmStore = create<CalmState>()(
  persist(
    (set) => ({
      roundLog: [],
      sessionLog: [],
      addRound: () => set((s) => ({ roundLog: [...s.roundLog, Date.now()] })),
      startSession: () => set((s) => ({ sessionLog: [...s.sessionLog, Date.now()] })),
    }),
    {
      name: 'calm',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

const DAY = 86400000;

/** Derive the calm stats shown on the Progress tab from the raw logs. */
export function calmStats(roundLog: number[], sessionLog: number[]) {
  const now = Date.now();
  const weekAgo = now - 7 * DAY;
  const roundsThisWeek = roundLog.filter((t) => t >= weekAgo).length;
  const sessionsThisWeek = sessionLog.filter((t) => t >= weekAgo).length;

  // Streak: consecutive days (ending today or yesterday) with at least one round.
  const activeDays = new Set(roundLog.map((t) => Math.floor(t / DAY)));
  let streak = 0;
  let day = Math.floor(now / DAY);
  if (!activeDays.has(day)) day -= 1; // allow the streak to still count through yesterday
  while (activeDays.has(day)) {
    streak += 1;
    day -= 1;
  }

  return {
    roundsThisWeek,
    sessionsThisWeek,
    totalRounds: roundLog.length,
    totalSessions: sessionLog.length,
    activeDays: activeDays.size,
    streak,
  };
}
