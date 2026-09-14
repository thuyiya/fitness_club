import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MeasurementUnit } from '@/types';
import { zustandStorage } from './storage';

export type ThemePreference = 'system' | 'light' | 'dark' | 'glass';
/** Health data stays on this device. */
export type DataMode = 'offline';

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
  /** Whether the 3-screen intro (after the splash) has been shown. First launch only. */
  welcomeSeen: boolean;
  /** Local storage mode. */
  dataMode: DataMode;
  setTheme: (t: ThemePreference) => void;
  setUnits: (u: MeasurementUnit) => void;
  toggleNotification: (k: keyof NotificationPrefs) => void;
  toggleHealth: (k: keyof SettingsState['connectedHealth']) => void;
  completeWelcome: () => void;
  setDataMode: (d: DataMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'dark',
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
      welcomeSeen: false,
      dataMode: 'offline',
      setTheme: (themePreference) => set({ themePreference }),
      setUnits: (units) => set({ units }),
      toggleNotification: (k) =>
        set((s) => ({ notifications: { ...s.notifications, [k]: !s.notifications[k] } })),
      toggleHealth: (k) =>
        set((s) => ({ connectedHealth: { ...s.connectedHealth, [k]: !s.connectedHealth[k] } })),
      completeWelcome: () => set({ welcomeSeen: true }),
      setDataMode: (dataMode) => set({ dataMode }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => zustandStorage),
      version: 2,
      migrate: (persisted) => {
        const state = { ...(persisted as Record<string, unknown>), dataMode: 'offline' };
        delete (state as Record<string, unknown>).tabBar;
        return state as unknown as SettingsState;
      },
    },
  ),
);
