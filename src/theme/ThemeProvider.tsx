import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, glassColors, lightColors, ThemeColors } from './colors';
import { radius, shadows, spacing, timing, typography } from './tokens';
import { useSettingsStore, ThemePreference } from '@/store/settingsStore';

export type ThemeName = 'light' | 'dark' | 'glass';

export interface Theme {
  /** The concrete theme in effect. */
  name: ThemeName;
  /** Light/dark resolution used for status bar and blur tint (glass counts as dark). */
  mode: 'light' | 'dark';
  /** True when the frosted translucent theme is active. */
  glass: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
  timing: typeof timing;
}

const ThemeContext = createContext<Theme | null>(null);

function resolveName(pref: ThemePreference, system: 'light' | 'dark'): ThemeName {
  if (pref === 'system') return system;
  return pref;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const preference = useSettingsStore((s) => s.themePreference);

  const theme = useMemo<Theme>(() => {
    const name = resolveName(preference, system);
    const colors = name === 'glass' ? glassColors : name === 'dark' ? darkColors : lightColors;
    return {
      name,
      mode: name === 'light' ? 'light' : 'dark',
      glass: name === 'glass',
      colors,
      spacing,
      radius,
      typography,
      shadows,
      timing,
    };
  }, [preference, system]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
