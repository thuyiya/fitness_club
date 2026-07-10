import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MeasurementUnit } from '@/types';
import { zustandStorage } from './storage';

export type ThemePreference = 'system' | 'light' | 'dark' | 'glass';
/** Where the user's data lives. 'cloud' is a stored preference (sync backend TBD). */
export type DataMode = 'cloud' | 'offline';

/** Every routeable bottom-tab. Order here == order in the tab bar. */
export type TabKey = 'index' | 'meals' | 'workouts' | 'progress' | 'coach' | 'settings';

/** Tab metadata for the customization UI. Settings is always present (locked). */
export const TAB_META: { key: TabKey; label: string; locked?: boolean }[] = [
  { key: 'index', label: 'Home' },
  { key: 'meals', label: 'Meals' },
  { key: 'workouts', label: 'Workouts' },
  { key: 'progress', label: 'Progress' },
  { key: 'coach', label: 'Coach' },
  { key: 'settings', label: 'Settings', locked: true },
];

/** The bottom bar holds at most this many tabs. */
export const MAX_TABS = 5;

/** Sensible default tab bar. Coach stays a tap away from Home's coach card. */
export const DEFAULT_TABS: TabKey[] = ['index', 'meals', 'workouts', 'progress', 'settings'];

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
  /** Cloud sync vs fully offline. */
  dataMode: DataMode;
  /** The tabs currently shown in the bottom bar (max MAX_TABS). */
  tabBar: TabKey[];
  setTheme: (t: ThemePreference) => void;
  setUnits: (u: MeasurementUnit) => void;
  toggleNotification: (k: keyof NotificationPrefs) => void;
  toggleHealth: (k: keyof SettingsState['connectedHealth']) => void;
  completeWelcome: () => void;
  setDataMode: (d: DataMode) => void;
  /** Toggle a tab in/out of the bottom bar (Settings can't be removed; capped at MAX_TABS). */
  toggleTab: (k: TabKey) => void;
}

const VALID_TABS = TAB_META.map((t) => t.key);

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
      tabBar: DEFAULT_TABS,
      setTheme: (themePreference) => set({ themePreference }),
      setUnits: (units) => set({ units }),
      toggleNotification: (k) =>
        set((s) => ({ notifications: { ...s.notifications, [k]: !s.notifications[k] } })),
      toggleHealth: (k) =>
        set((s) => ({ connectedHealth: { ...s.connectedHealth, [k]: !s.connectedHealth[k] } })),
      completeWelcome: () => set({ welcomeSeen: true }),
      setDataMode: (dataMode) => set({ dataMode }),
      toggleTab: (k) =>
        set((s) => {
          if (k === 'settings') return s; // Settings is always available
          const has = s.tabBar.includes(k);
          if (has) {
            return { tabBar: s.tabBar.filter((t) => t !== k) };
          }
          if (s.tabBar.length >= MAX_TABS) return s; // cap reached — ignore
          // Insert keeping the canonical TAB_META order so the bar stays tidy.
          const order = TAB_META.map((t) => t.key);
          const next = [...s.tabBar, k].sort((a, b) => order.indexOf(a) - order.indexOf(b));
          return { tabBar: next };
        }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => zustandStorage),
      version: 1,
      // v0 → v1: the Calm tab (and focus system) were removed; scrub stale
      // 'calm' entries from a persisted tab bar so the picker/cap stay correct.
      migrate: (persisted) => {
        const s = persisted as Partial<SettingsState> | undefined;
        if (s?.tabBar) {
          const cleaned = s.tabBar.filter((t) => VALID_TABS.includes(t));
          s.tabBar = cleaned.length > 0 ? cleaned : DEFAULT_TABS;
        }
        return s as SettingsState;
      },
    },
  ),
);
