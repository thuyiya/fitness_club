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

export const member: Theme = {
  bg: "#F6F5F1",
  card: "#FFFFFF",
  cardAlt: "#EFEDE6",
  ink: "#14161C",
  inkSoft: "#565A6E",
  muted: "#8A8D9E",
  line: "#E7E4DC",
  ...palette,
};

export const coach: Theme = {
  bg: "#0B0C10",
  card: "#16181F",
  cardAlt: "#1D2029",
  ink: "#F5F6FA",
  inkSoft: "#9A9EC0",
  muted: "#6B6E85",
  line: "#242733",
  ...palette,
};

/** Admin reuses the coach palette with indigo promoted to the accent. */
export const admin: Theme = { ...coach, accent: palette.indigo, accentDeep: "#3E5FD9" };

export const themeForRole = (role: "admin" | "coach" | "member"): Theme =>
  role === "member" ? member : role === "admin" ? admin : coach;

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
