/**
 * Color system for Solace — a calm, greenish wellness palette.
 * Three themes share the same semantic tokens so components never touch raw hex:
 *   • light — soft cream-green, dark text
 *   • dark  — deep calm green, bright text (the default)
 *   • glass — frosted translucent surfaces over a deep-green backdrop
 */

export const palette = {
  primary: '#557E40',
  primaryLight: '#8FBF6F',
  primaryDark: '#3E6130',
  secondary: '#3B8574',
  secondaryLight: '#6EC5AE',
  success: '#4CAF6E',
  successLight: '#77D69A',
  warning: '#D99A34',
  warningLight: '#F0C061',
  danger: '#CE6258',
  dangerLight: '#EC8B82',
  water: '#4FA3C4',
  protein: '#8677BE',
  carbs: '#D99A34',
  fat: '#D585A2',
  walking: '#3BA089',
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

/** Data-viz / functional accents, tuned per luminance for clear contrast. */
const softAccents = {
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  water: palette.water,
  protein: palette.protein,
  carbs: palette.carbs,
  fat: palette.fat,
  walking: palette.walking,
};

const brightAccents = {
  success: palette.successLight,
  warning: palette.warningLight,
  danger: palette.dangerLight,
  water: '#68C7E0',
  protein: '#AE9FE0',
  carbs: palette.warningLight,
  fat: '#EDA6C2',
  walking: '#66C9B2',
};

export const lightColors: ThemeColors = {
  primary: palette.primary,
  primaryLight: palette.primaryLight,
  primaryDark: palette.primaryDark,
  secondary: palette.secondary,
  secondaryLight: palette.secondaryLight,
  ...softAccents,

  background: '#F2F5EA',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255,255,255,0.72)',
  card: '#FFFFFF',
  cardBorder: 'rgba(38,48,30,0.10)',

  text: '#22301A',
  textSecondary: '#4C5A40',
  textTertiary: '#7E8B70',
  textInverse: '#FFFFFF',

  separator: 'rgba(38,48,30,0.10)',
  overlay: 'rgba(30,40,22,0.40)',

  gradientStart: '#E7EFD6',
  gradientEnd: '#F2F5EA',
  shadow: '#2A3320',
};

export const darkColors: ThemeColors = {
  primary: palette.primaryLight,
  primaryLight: '#B4DE9A',
  primaryDark: palette.primary,
  secondary: palette.secondaryLight,
  secondaryLight: '#96D9C9',
  ...brightAccents,

  background: '#121A11',
  backgroundElevated: '#1B261A',
  surface: '#1B261A',
  surfaceGlass: 'rgba(27,38,26,0.72)',
  card: 'rgba(27,38,26,0.90)',
  cardBorder: 'rgba(255,255,255,0.12)',

  text: '#EEF3E6',
  textSecondary: '#C2CEB4',
  textTertiary: '#8A9A7A',
  textInverse: '#121A11',

  separator: 'rgba(255,255,255,0.10)',
  overlay: 'rgba(0,0,0,0.60)',

  gradientStart: '#121A11',
  gradientEnd: '#0E1B16',
  shadow: '#000000',
};

export const glassColors: ThemeColors = {
  primary: '#A6D585',
  primaryLight: '#C2E5AC',
  primaryDark: palette.primaryLight,
  secondary: '#83D6C0',
  secondaryLight: '#A6E4D5',
  ...brightAccents,

  background: '#16241C',
  backgroundElevated: 'rgba(255,255,255,0.10)',
  surface: 'rgba(255,255,255,0.08)',
  surfaceGlass: 'rgba(255,255,255,0.12)',
  card: 'rgba(255,255,255,0.09)',
  cardBorder: 'rgba(255,255,255,0.20)',

  text: '#F1F7EC',
  textSecondary: 'rgba(241,247,236,0.82)',
  textTertiary: 'rgba(241,247,236,0.58)',
  textInverse: '#12201A',

  separator: 'rgba(255,255,255,0.16)',
  overlay: 'rgba(0,0,0,0.50)',

  gradientStart: '#20362A',
  gradientEnd: '#101D17',
  shadow: '#000000',
};
