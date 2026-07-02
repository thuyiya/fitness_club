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
  setTheme: (t: ThemePreference) => void;
  setUnits: (u: MeasurementUnit) => void;
  toggleNotification: (k: keyof NotificationPrefs) => void;
  toggleHealth: (k: keyof SettingsState['connectedHealth']) => void;
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
      setTheme: (themePreference) => set({ themePreference }),
      setUnits: (units) => set({ units }),
      toggleNotification: (k) =>
        set((s) => ({ notifications: { ...s.notifications, [k]: !s.notifications[k] } })),
      toggleHealth: (k) =>
        set((s) => ({ connectedHealth: { ...s.connectedHealth, [k]: !s.connectedHealth[k] } })),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
