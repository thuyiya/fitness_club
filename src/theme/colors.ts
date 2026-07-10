/**
 * Color system for Nutrition + Fitness — the "Ember" palette: deep warm
 * charcoal neutrals with vibrant orange-amber accents.
 * Three themes share the same semantic tokens so components never touch raw hex:
 *   • light — warm stone off-white, charcoal text
 *   • dark  — near-black warm charcoal, ember accents (the default)
 *   • glass — frosted translucent surfaces over a warm charcoal backdrop
 */

export const palette = {
  primary: '#F97316',
  primaryLight: '#FB923C',
  primaryDark: '#C2410C',
  secondary: '#F59E0B',
  secondaryLight: '#FBBF24',
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
  // Darker ember shades so text/icons on white keep AA contrast.
  primary: '#C2410C',
  primaryLight: '#F97316',
  primaryDark: '#9A3412',
  secondary: '#B45309',
  secondaryLight: '#F59E0B',
  ...softAccents,

  background: '#FAFAF9',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255,255,255,0.72)',
  card: '#FFFFFF',
  cardBorder: 'rgba(41,37,36,0.10)',

  text: '#292524',
  textSecondary: '#57534E',
  textTertiary: '#78716C',
  textInverse: '#FFFFFF',

  separator: 'rgba(41,37,36,0.10)',
  overlay: 'rgba(28,25,23,0.40)',

  gradientStart: '#F6EEE6',
  gradientEnd: '#FAFAF9',
  shadow: '#292524',
};

export const darkColors: ThemeColors = {
  primary: palette.primaryLight,
  primaryLight: '#FDBA74',
  primaryDark: palette.primary,
  secondary: palette.secondaryLight,
  secondaryLight: '#FCD34D',
  ...brightAccents,

  background: '#151312',
  backgroundElevated: '#211D1A',
  surface: '#211D1A',
  surfaceGlass: 'rgba(33,29,26,0.72)',
  card: 'rgba(33,29,26,0.90)',
  cardBorder: 'rgba(255,255,255,0.12)',

  text: '#F5F1EC',
  textSecondary: '#CFC7BE',
  textTertiary: '#968C82',
  textInverse: '#1C1917',

  separator: 'rgba(255,255,255,0.10)',
  overlay: 'rgba(0,0,0,0.60)',

  gradientStart: '#1C1917',
  gradientEnd: '#120F0D',
  shadow: '#000000',
};

export const glassColors: ThemeColors = {
  primary: '#FDBA74',
  primaryLight: '#FED7AA',
  primaryDark: '#FB923C',
  secondary: '#FCD34D',
  secondaryLight: '#FDE68A',
  ...brightAccents,

  background: '#201A16',
  backgroundElevated: 'rgba(255,255,255,0.10)',
  surface: 'rgba(255,255,255,0.08)',
  surfaceGlass: 'rgba(255,255,255,0.12)',
  card: 'rgba(255,255,255,0.09)',
  cardBorder: 'rgba(255,255,255,0.20)',

  text: '#F7F2EC',
  textSecondary: 'rgba(247,242,236,0.82)',
  textTertiary: 'rgba(247,242,236,0.58)',
  textInverse: '#201510',

  separator: 'rgba(255,255,255,0.16)',
  overlay: 'rgba(0,0,0,0.50)',

  gradientStart: '#362518',
  gradientEnd: '#17110D',
  shadow: '#000000',
};
