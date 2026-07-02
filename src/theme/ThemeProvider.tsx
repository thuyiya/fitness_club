import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, ThemeColors } from './colors';
import { radius, shadows, spacing, timing, typography } from './tokens';
import { useSettingsStore, ThemePreference } from '@/store/settingsStore';

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
  timing: typeof timing;
}

const ThemeContext = createContext<Theme | null>(null);

function resolveMode(pref: ThemePreference, system: 'light' | 'dark'): 'light' | 'dark' {
  if (pref === 'system') return system;
  return pref;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const preference = useSettingsStore((s) => s.themePreference);

  const theme = useMemo<Theme>(() => {
    const mode = resolveMode(preference, system);
    return {
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
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
