import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Plan, UserProfile, WeightEntry } from '@/types';
import { zustandStorage } from './storage';
import { buildPlan } from '@/lib/planEngine';

interface UserState {
  onboarded: boolean;
  profile: UserProfile | null;
  plan: Plan | null;
  weightHistory: WeightEntry[];
  /** Persist profile, generate the plan, and seed weight history. */
  completeOnboarding: (profile: UserProfile) => void;
  regeneratePlan: () => void;
  logWeight: (weightKg: number) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      profile: null,
      plan: null,
      weightHistory: [],
      completeOnboarding: (profile) => {
        const plan = buildPlan(profile);
        set({
          onboarded: true,
          profile,
          plan,
          weightHistory: [{ date: profile.createdAt, weightKg: profile.weightKg }],
        });
      },
      regeneratePlan: () => {
        const { profile } = get();
        if (!profile) return;
        set({ plan: buildPlan(profile) });
      },
      logWeight: (weightKg) => {
        const entry: WeightEntry = { date: Date.now(), weightKg };
        set((s) => ({ weightHistory: [...s.weightHistory, entry] }));
        const { profile } = get();
        if (profile) {
          const updated = { ...profile, weightKg };
          set({ profile: updated, plan: buildPlan(updated) });
        }
      },
      updateProfile: (patch) => {
        const { profile } = get();
        if (!profile) return;
        const updated = { ...profile, ...patch };
        set({ profile: updated, plan: buildPlan(updated) });
      },
      reset: () => set({ onboarded: false, profile: null, plan: null, weightHistory: [] }),
    }),
    {
      name: 'user',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
