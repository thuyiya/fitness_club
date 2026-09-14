import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "./storage";
import { ExercisePreferences } from "@/lib/exercisePlan";
interface ExerciseState {
  preferences: ExercisePreferences;
  completed: Record<string, string[]>;
  logged: Record<string, boolean>;
  configure: (p: ExercisePreferences) => void;
  toggle: (date: string, id: string) => void;
  finish: (date: string) => boolean;
}
export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set, get) => ({
      preferences: { minutes: 25, level: "gentle", variation: 0 },
      completed: {},
      logged: {},
      configure: (preferences) => set({ preferences }),
      toggle: (date, id) =>
        set((s) => {
          const rows = s.completed[date] ?? [];
          return {
            completed: {
              ...s.completed,
              [date]: rows.includes(id)
                ? rows.filter((x) => x !== id)
                : [...rows, id],
            },
          };
        }),
      finish: (date) => {
        if (get().logged[date]) return false;
        set((s) => ({ logged: { ...s.logged, [date]: true } }));
        return true;
      },
    }),
    {
      name: "exercise-schedule",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
