import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MeasurementUnit } from '@/types';
import { zustandStorage } from './storage';

export type ThemePreference = 'system' | 'light' | 'dark' | 'glass';
/** Which experience the app is tuned around. Calm hides nutrition/fitness surfaces. */
export type FocusMode = 'calm' | 'wellness';
/** Where the user's data lives. 'cloud' is a stored preference (sync backend TBD). */
export type DataMode = 'cloud' | 'offline';

/** Every routeable bottom-tab. Order here == order in the tab bar. */
export type TabKey = 'index' | 'meals' | 'workouts' | 'calm' | 'progress' | 'coach' | 'settings';

/** Tab metadata for the customization UI. Settings is always present (locked). */
export const TAB_META: { key: TabKey; label: string; locked?: boolean }[] = [
  { key: 'index', label: 'Home' },
  { key: 'meals', label: 'Meals' },
  { key: 'workouts', label: 'Workouts' },
  { key: 'calm', label: 'Calm' },
  { key: 'progress', label: 'Progress' },
  { key: 'coach', label: 'Coach' },
  { key: 'settings', label: 'Settings', locked: true },
];

/** The bottom bar holds at most this many tabs. */
export const MAX_TABS = 5;

/** Sensible default tab bar for each focus. */
export function defaultTabsFor(focus: FocusMode): TabKey[] {
  return focus === 'calm'
    ? ['calm', 'progress', 'coach', 'settings']
    : ['index', 'calm', 'progress', 'coach', 'settings'];
}

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
  /** Main focus chosen in onboarding — drives which tabs appear. */
  focus: FocusMode;
  /** Cloud sync vs fully offline. */
  dataMode: DataMode;
  /** The tabs currently shown in the bottom bar (max MAX_TABS). */
  tabBar: TabKey[];
  setTheme: (t: ThemePreference) => void;
  setUnits: (u: MeasurementUnit) => void;
  toggleNotification: (k: keyof NotificationPrefs) => void;
  toggleHealth: (k: keyof SettingsState['connectedHealth']) => void;
  completeMindIntro: () => void;
  completeWelcome: () => void;
  setCalmBed: (id: string) => void;
  setFocus: (f: FocusMode) => void;
  setDataMode: (d: DataMode) => void;
  /** Toggle a tab in/out of the bottom bar (Settings can't be removed; capped at MAX_TABS). */
  toggleTab: (k: TabKey) => void;
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
      mindIntroSeen: false,
      welcomeSeen: false,
      calmBed: 'drift',
      focus: 'wellness',
      dataMode: 'offline',
      tabBar: defaultTabsFor('wellness'),
      setTheme: (themePreference) => set({ themePreference }),
      setUnits: (units) => set({ units }),
      toggleNotification: (k) =>
        set((s) => ({ notifications: { ...s.notifications, [k]: !s.notifications[k] } })),
      toggleHealth: (k) =>
        set((s) => ({ connectedHealth: { ...s.connectedHealth, [k]: !s.connectedHealth[k] } })),
      completeMindIntro: () => set({ mindIntroSeen: true }),
      completeWelcome: () => set({ welcomeSeen: true }),
      setCalmBed: (calmBed) => set({ calmBed }),
      // Switching focus resets the bar to that focus's sensible default.
      setFocus: (focus) => set({ focus, tabBar: defaultTabsFor(focus) }),
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
    },
  ),
);
