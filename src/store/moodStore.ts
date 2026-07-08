import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from './storage';

/**
 * Mood check-ins — the emotional layer behind Solace's "How are you feeling?"
 * flow. Kept deliberately small and self-contained so the AI coach can read a
 * user's recent emotional state without pulling in the whole domain model.
 *
 * All types are local to this file on purpose (src/types is owned elsewhere).
 */

/** Controlled set of primary emotions the picker can produce. */
export type MoodEmotion =
  | 'happy'
  | 'calm'
  | 'grateful'
  | 'neutral'
  | 'tired'
  | 'anxious'
  | 'sad'
  | 'angry'
  | 'hurting'
  | 'numb';

export const MOOD_EMOTIONS: MoodEmotion[] = [
  'happy',
  'calm',
  'grateful',
  'neutral',
  'tired',
  'anxious',
  'sad',
  'angry',
  'hurting',
  'numb',
];

export interface MoodEntry {
  /** Collision-safe id: timestamp + monotonic counter. */
  id: string;
  /** When the check-in was saved, in ms since epoch. */
  timestamp: number;
  /** -1 (sad / unpleasant) … 0 (neutral) … 1 (happy / pleasant). */
  valence: number;
  /** 0 (calm / low) … 1 (energized / high). */
  energy: number;
  /** The chosen primary emotion. */
  primary: MoodEmotion;
  /** 0 (barely) … 1 (very strongly) — how strongly the emotion is felt. */
  intensity: number;
  /** Optional free-text note the user attached. */
  note?: string;
}

/** A small, human-readable summary of where the user has been lately. */
export interface MoodTrend {
  /** How many entries the summary is based on. */
  count: number;
  /** Mean valence across the window, or null when there's nothing to show. */
  avgValence: number | null;
  /** Mean energy across the window, or null when there's nothing to show. */
  avgEnergy: number | null;
  /** Mean intensity across the window, or null. */
  avgIntensity: number | null;
  /** The most frequently reported primary emotion, or null. */
  dominant: MoodEmotion | null;
  /** valence[last] − valence[first]: >0 improving, <0 dipping, 0 steady. */
  direction: 'improving' | 'steady' | 'declining' | 'unknown';
  /** One-line natural-language gloss the coach can drop straight into a prompt. */
  summary: string;
}

/** Payload accepted by addEntry — id + timestamp are filled in for you. */
export type MoodDraft = Omit<MoodEntry, 'id' | 'timestamp'> &
  Partial<Pick<MoodEntry, 'timestamp'>>;

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

// Monotonic counter so two entries saved in the same millisecond never collide.
let idCounter = 0;
function nextId(ts: number): string {
  idCounter = (idCounter + 1) % 100000;
  return `mood_${ts.toString(36)}_${idCounter.toString(36)}`;
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function dominantEmotion(entries: MoodEntry[]): MoodEmotion | null {
  if (entries.length === 0) return null;
  const counts = new Map<MoodEmotion, number>();
  for (const e of entries) counts.set(e.primary, (counts.get(e.primary) ?? 0) + 1);
  let best: MoodEmotion | null = null;
  let bestN = -1;
  for (const [emotion, n] of counts) {
    if (n > bestN) {
      best = emotion;
      bestN = n;
    }
  }
  return best;
}

function valenceWord(v: number | null): string {
  if (v === null) return 'unclear';
  if (v >= 0.5) return 'good';
  if (v >= 0.15) return 'gently positive';
  if (v > -0.15) return 'neutral';
  if (v > -0.5) return 'low';
  return 'heavy';
}

interface MoodState {
  entries: MoodEntry[];
  /** Save a new check-in. Returns the stored entry. */
  addEntry: (draft: MoodDraft) => MoodEntry;
  /** The most recent check-in, or undefined if none exist. */
  latest: () => MoodEntry | undefined;
  /** All check-ins recorded on a given ISO date (YYYY-MM-DD), newest first. */
  entriesForDay: (dateISO: string) => MoodEntry[];
  /** A compact summary of the last `n` check-ins (default 7) for the coach. */
  recentTrend: (n?: number) => MoodTrend;
  /** Remove a single check-in by id. */
  removeEntry: (id: string) => void;
  /** Wipe all check-ins. */
  clear: () => void;
}

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (draft) => {
        const timestamp = draft.timestamp ?? Date.now();
        const entry: MoodEntry = {
          id: nextId(timestamp),
          timestamp,
          valence: clamp(draft.valence, -1, 1),
          energy: clamp(draft.energy, 0, 1),
          primary: draft.primary,
          intensity: clamp(draft.intensity, 0, 1),
          note: draft.note?.trim() ? draft.note.trim() : undefined,
        };
        // Newest first so latest()/lists are cheap.
        set((s) => ({ entries: [entry, ...s.entries] }));
        return entry;
      },

      latest: () => get().entries[0],

      entriesForDay: (dateISO) =>
        get().entries.filter((e) => dayKey(e.timestamp) === dateISO),

      recentTrend: (n = 7) => {
        // entries are newest-first; take the most recent `n`, reason oldest→newest.
        const recent = get().entries.slice(0, Math.max(1, n));
        const chrono = [...recent].reverse();
        const count = chrono.length;

        if (count === 0) {
          return {
            count: 0,
            avgValence: null,
            avgEnergy: null,
            avgIntensity: null,
            dominant: null,
            direction: 'unknown',
            summary: 'No mood check-ins yet.',
          };
        }

        const avgValence = mean(chrono.map((e) => e.valence));
        const avgEnergy = mean(chrono.map((e) => e.energy));
        const avgIntensity = mean(chrono.map((e) => e.intensity));
        const dominant = dominantEmotion(chrono);

        const delta = chrono[chrono.length - 1].valence - chrono[0].valence;
        const direction: MoodTrend['direction'] =
          count < 2 ? 'unknown' : delta > 0.15 ? 'improving' : delta < -0.15 ? 'declining' : 'steady';

        const trendPhrase =
          direction === 'improving'
            ? ', trending up'
            : direction === 'declining'
              ? ', trending down'
              : direction === 'steady'
                ? ', holding steady'
                : '';

        const summary =
          count === 1
            ? `Feeling ${dominant} (${valenceWord(avgValence)}).`
            : `Over the last ${count} check-ins, mostly ${dominant} and ${valenceWord(
                avgValence,
              )}${trendPhrase}.`;

        return { count, avgValence, avgEnergy, avgIntensity, dominant, direction, summary };
      },

      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      clear: () => set({ entries: [] }),
    }),
    {
      name: 'moods',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
