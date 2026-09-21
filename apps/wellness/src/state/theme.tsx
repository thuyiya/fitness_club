import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultScheme, type Role, type Scheme } from "../theme/tokens";

export type ThemePreference = "system" | "light" | "dark";

interface ThemeValue {
  preference: ThemePreference;
  /** What the preference resolves to right now, given role and device setting. */
  scheme: Scheme;
  setPreference: (p: ThemePreference) => void;
}

const KEY = "wellness.themePreference";
const Ctx = createContext<ThemeValue | null>(null);

/**
 * Theme preference, stored per device rather than per account.
 *
 * "system" is the default and follows the OS, EXCEPT that a device with no
 * stated preference falls back to the role's design default --- light for
 * members, dark for coaches --- rather than forcing everyone light.
 */
export function ThemeProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  const device = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v === "light" || v === "dark" || v === "system") setPref(v); })
      .catch(() => {});
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    AsyncStorage.setItem(KEY, p).catch(() => {});
  }, []);

  const scheme: Scheme =
    preference === "system" ? (device === "dark" || device === "light" ? device : defaultScheme(role)) : preference;

  const value = useMemo(() => ({ preference, scheme, setPreference }), [preference, scheme, setPreference]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  // Outside the provider (the sign-in screen mounts before a role is known)
  // fall back to the light default rather than throwing.
  return ctx ?? { preference: "system" as ThemePreference, scheme: "light" as Scheme, setPreference: () => {} };
}
