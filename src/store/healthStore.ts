import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "./storage";
import { healthNative, HealthWeek } from "@/lib/health";
interface HealthState {
  enabled: boolean;
  data: HealthWeek | null;
  busy: boolean;
  error: string | null;
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
  disconnect: () => void;
}
let generation = 0;
export const useHealthStore = create<HealthState>()(
  persist(
    (set, get) => ({
      enabled: false,
      data: null,
      busy: false,
      error: null,
      connect: async () => {
        if (get().busy) return;
        if (!healthNative?.isAvailable()) {
          set({
            error:
              "Apple Health requires a compatible iPhone and a fresh native build of this app.",
          });
          return;
        }
        const token = ++generation;
        set({ busy: true, error: null });
        try {
          const finished = await healthNative.requestAccess();
          if (token !== generation) return;
          if (!finished)
            throw new Error(
              "The permission request was not completed. Try connecting again.",
            );
          set({ enabled: true, busy: false });
          await get().refresh();
        } catch (e) {
          if (token === generation)
            set({
              busy: false,
              error:
                e instanceof Error
                  ? e.message
                  : "Could not connect to Apple Health.",
            });
        }
      },
      refresh: async () => {
        if (!get().enabled || get().busy || !healthNative) return;
        const token = ++generation;
        set({ busy: true, error: null });
        try {
          const data = await healthNative.readWeek();
          if (token === generation) set({ data, busy: false });
        } catch (e) {
          if (token === generation)
            set({
              busy: false,
              data: null,
              error:
                e instanceof Error
                  ? e.message
                  : "Could not refresh Apple Health.",
            });
        }
      },
      disconnect: () => {
        generation++;
        set({ enabled: false, data: null, busy: false, error: null });
      },
    }),
    {
      name: "apple-health-preference",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ enabled: s.enabled }),
    },
  ),
);
// Health samples remain in memory; HealthKit is their persistent source of truth.
