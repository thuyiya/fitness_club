/** Violet and cyan accents over cool, quiet surfaces. */

export const palette = {
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#6D28D9',
  secondary: '#22D3EE',
  secondaryLight: '#67E8F9',
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
  primary: '#6D28D9',
  primaryLight: '#8B5CF6',
  primaryDark: '#5B21B6',
  secondary: '#0E7490',
  secondaryLight: '#22D3EE',
  ...softAccents,

  background: '#F6F7FC',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255,255,255,0.72)',
  card: '#FFFFFF',
  cardBorder: 'rgba(41,37,36,0.10)',

  text: '#182039',
  textSecondary: '#525C76',
  textTertiary: '#68738D',
  textInverse: '#FFFFFF',

  separator: 'rgba(41,37,36,0.10)',
  overlay: 'rgba(28,25,23,0.40)',

  gradientStart: '#EFEBFF',
  gradientEnd: '#F6F7FC',
  shadow: '#182039',
};

export const darkColors: ThemeColors = {
  primary: palette.primaryLight,
  primaryLight: '#C4B5FD',
  primaryDark: palette.primary,
  secondary: palette.secondaryLight,
  secondaryLight: '#67E8F9',
  ...brightAccents,

  background: '#0B1020',
  backgroundElevated: '#151D33',
  surface: '#151D33',
  surfaceGlass: 'rgba(21,29,51,0.72)',
  card: 'rgba(21,29,51,0.90)',
  cardBorder: 'rgba(255,255,255,0.12)',

  text: '#F2F4FF',
  textSecondary: '#B9C4DE',
  textTertiary: '#8C9AB8',
  textInverse: '#10172B',

  separator: 'rgba(255,255,255,0.10)',
  overlay: 'rgba(0,0,0,0.60)',

  gradientStart: '#10172B',
  gradientEnd: '#090D19',
  shadow: '#000000',
};

export const glassColors: ThemeColors = {
  primary: '#C4B5FD',
  primaryLight: '#DDD6FE',
  primaryDark: '#A78BFA',
  secondary: '#67E8F9',
  secondaryLight: '#A5F3FC',
  ...brightAccents,

  background: '#10172B',
  backgroundElevated: 'rgba(255,255,255,0.10)',
  surface: 'rgba(255,255,255,0.08)',
  surfaceGlass: 'rgba(255,255,255,0.12)',
  card: 'rgba(255,255,255,0.09)',
  cardBorder: 'rgba(255,255,255,0.20)',

  text: '#F2F4FF',
  textSecondary: 'rgba(242,244,255,0.82)',
  textTertiary: 'rgba(242,244,255,0.58)',
  textInverse: '#10172B',

  separator: 'rgba(255,255,255,0.16)',
  overlay: 'rgba(0,0,0,0.50)',

  gradientStart: '#231C46',
  gradientEnd: '#0C1628',
  shadow: '#000000',
};
