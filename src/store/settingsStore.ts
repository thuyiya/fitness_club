import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MeasurementUnit } from '@/types';
import { zustandStorage } from './storage';

export type ThemePreference = 'system' | 'light' | 'dark';

interface NotificationPrefs {
  meals: boolean;
  walk: boolean;
  workout: boolean;
  water: boolean;
  weighIn: boolean;
  motivation: boolean;
}

interface SettingsState {
  themePreference: ThemePreference;
  units: MeasurementUnit;
  notifications: NotificationPrefs;
  connectedHealth: { apple: boolean; google: boolean; samsung: boolean };
  /** Whether the one-time "Clearing the Mind" intro on the Calm tab has been shown. */
  mindIntroSeen: boolean;
  /** Whether the 3-screen wellness intro (after the splash) has been shown. First launch only. */
  welcomeSeen: boolean;
  /** Selected Calm ambient bed ('drift' | 'morning' | 'night' | 'aurora' | 'off'). */
  calmBed: string;
  setTheme: (t: ThemePreference) => void;
  setUnits: (u: MeasurementUnit) => void;
  toggleNotification: (k: keyof NotificationPrefs) => void;
  toggleHealth: (k: keyof SettingsState['connectedHealth']) => void;
  completeMindIntro: () => void;
  completeWelcome: () => void;
  setCalmBed: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      units: 'metric',
      notifications: {
        meals: true,
        walk: true,
        workout: true,
        water: true,
        weighIn: true,
        motivation: true,
      },
      connectedHealth: { apple: false, google: false, samsung: false },
      mindIntroSeen: false,
      welcomeSeen: false,
      calmBed: 'drift',
      setTheme: (themePreference) => set({ themePreference }),
      setUnits: (units) => set({ units }),
      toggleNotification: (k) =>
        set((s) => ({ notifications: { ...s.notifications, [k]: !s.notifications[k] } })),
      toggleHealth: (k) =>
        set((s) => ({ connectedHealth: { ...s.connectedHealth, [k]: !s.connectedHealth[k] } })),
      completeMindIntro: () => set({ mindIntroSeen: true }),
      completeWelcome: () => set({ welcomeSeen: true }),
      setCalmBed: (calmBed) => set({ calmBed }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
