/**
 * Design tokens from design/gym-coach-flows/gym-coach-ui.fig.
 *
 * The member journey is light and the coach/admin journeys are dark. That is
 * not decoration: a member opens this between sets in a bright gym, a coach
 * works through it at a desk. Keeping two palettes rather than one theme
 * toggle is what the 58 designed screens assume.
 */

/**
 * Logo colours. Deliberately NOT in `palette`: the mark's lime is #C1FB09 and
 * the UI accent lime is #B4FF3A, and they must not be used interchangeably ---
 * tinting the logo with the accent (or an accent with the logo lime) is how a
 * brand drifts. The mark is drawn for a dark field, so it always sits on
 * `brand.black`, including on the light member palette.
 */
export const brand = {
  lime: "#C1FB09",
  black: "#000000",
} as const;

export const palette = {
  accent: "#FF5A36",
  accentDeep: "#E2431F",
  teal: "#17B8A6",
  lime: "#B4FF3A",
  warning: "#FFB020",
  danger: "#FF4757",
  indigo: "#5B7FFF", // admin only
} as const;

/** Every palette satisfies this, so components take a Theme and stay palette-agnostic. */
export interface Theme {
  bg: string; card: string; cardAlt: string;
  ink: string; inkSoft: string; muted: string; line: string;
  accent: string; accentDeep: string;
  teal: string; lime: string; warning: string; danger: string; indigo: string;
}

/**
 * Neutrals come in two sets; the accent comes from the role.
 *
 * The design gives members a light journey and coaches a dark one, and that
 * stays the DEFAULT --- a member checks this between sets in a bright gym, a
 * coach works at a desk. But a default is not a rule, so either can pick the
 * other, and the palettes are built from one pair of neutral ramps rather than
 * four hand-written themes that drift apart.
 */
const lightNeutrals = {
  bg: "#F6F5F1",
  card: "#FFFFFF",
  cardAlt: "#EFEDE6",
  ink: "#14161C",
  inkSoft: "#565A6E",
  muted: "#8A8D9E",
  line: "#E7E4DC",
} as const;

const darkNeutrals = {
  bg: "#0B0C10",
  card: "#16181F",
  cardAlt: "#1D2029",
  ink: "#F5F6FA",
  inkSoft: "#9A9EC0",
  muted: "#6B6E85",
  line: "#242733",
} as const;

export type Scheme = "light" | "dark";
export type Role = "admin" | "coach" | "member";

export const member: Theme = { ...lightNeutrals, ...palette };
export const coach: Theme = { ...darkNeutrals, ...palette };
/** Admin keeps the dark ground but swaps the accent to indigo, per the design. */
export const admin: Theme = { ...darkNeutrals, ...palette, accent: palette.indigo, accentDeep: "#3E5FD9" };

/** The scheme each role starts on before anyone expresses a preference. */
export const defaultScheme = (role: Role): Scheme => (role === "member" ? "light" : "dark");

export function themeFor(role: Role, scheme: Scheme): Theme {
  const neutrals = scheme === "dark" ? darkNeutrals : lightNeutrals;
  return role === "admin"
    ? { ...neutrals, ...palette, accent: palette.indigo, accentDeep: "#3E5FD9" }
    : { ...neutrals, ...palette };
}

/** Kept for call sites that have a role but no stored preference yet. */
export const themeForRole = (role: Role): Theme => themeFor(role, defaultScheme(role));

export const radius = { sm: 12, md: 20, lg: 28, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const type = {
  display: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.3 },
  heading: { fontSize: 16, fontWeight: "600" as const },
  body: { fontSize: 14, fontWeight: "400" as const },
  label: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.4 },
  caption: { fontSize: 11, fontWeight: "400" as const },
} as const;
