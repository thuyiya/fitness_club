/**
 * Color system for AI Weight Coach.
 * Brand palette follows the product spec; each mode exposes semantic tokens
 * so components never reference raw hex values directly.
 */

export const palette = {
  primary: '#2563EB',
  primaryLight: '#60A5FA',
  primaryDark: '#1D4ED8',
  secondary: '#4F46E5',
  secondaryLight: '#818CF8',
  success: '#22C55E',
  successLight: '#4ADE80',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  danger: '#EF4444',
  dangerLight: '#F87171',
  water: '#06B6D4',
  protein: '#8B5CF6',
  carbs: '#F59E0B',
  fat: '#EC4899',
  walking: '#14B8A6',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  success: string;
  warning: string;
  danger: string;
  water: string;
  protein: string;
  carbs: string;
  fat: string;
  walking: string;

  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceGlass: string;
  card: string;
  cardBorder: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  separator: string;
  overlay: string;

  gradientStart: string;
  gradientEnd: string;
  shadow: string;
}

export const lightColors: ThemeColors = {
  primary: palette.primary,
  primaryLight: palette.primaryLight,
  primaryDark: palette.primaryDark,
  secondary: palette.secondary,
  secondaryLight: palette.secondaryLight,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  water: palette.water,
  protein: palette.protein,
  carbs: palette.carbs,
  fat: palette.fat,
  walking: palette.walking,

  background: '#F8FAFC',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255,255,255,0.72)',
  card: '#FFFFFF',
  cardBorder: 'rgba(15,23,42,0.06)',

  text: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  separator: 'rgba(15,23,42,0.08)',
  overlay: 'rgba(15,23,42,0.4)',

  gradientStart: '#EFF6FF',
  gradientEnd: '#F8FAFC',
  shadow: '#1E293B',
};

export const darkColors: ThemeColors = {
  primary: palette.primaryLight,
  primaryLight: '#93C5FD',
  primaryDark: palette.primary,
  secondary: palette.secondaryLight,
  secondaryLight: '#A5B4FC',
  success: palette.successLight,
  warning: palette.warningLight,
  danger: palette.dangerLight,
  water: '#22D3EE',
  protein: '#A78BFA',
  carbs: palette.warningLight,
  fat: '#F472B6',
  walking: '#2DD4BF',

  background: '#0F172A',
  backgroundElevated: '#1E293B',
  surface: '#1E293B',
  surfaceGlass: 'rgba(30,41,59,0.72)',
  card: 'rgba(30,41,59,0.85)',
  cardBorder: 'rgba(255,255,255,0.08)',

  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#64748B',
  textInverse: '#0F172A',

  separator: 'rgba(255,255,255,0.08)',
  overlay: 'rgba(0,0,0,0.6)',

  gradientStart: '#0F172A',
  gradientEnd: '#1E1B4B',
  shadow: '#000000',
};
