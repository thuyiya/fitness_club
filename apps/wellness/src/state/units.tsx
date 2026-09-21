import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type UnitSystem = "metric" | "imperial";

interface UnitsValue {
  system: UnitSystem;
  setSystem: (s: UnitSystem) => void;
  /** Formatters. Storage is always metric; only the display converts. */
  weight: (kg: number | string | null | undefined, digits?: number) => string;
  height: (cm: number | string | null | undefined) => string;
  volume: (ml: number | null | undefined) => string;
  distance: (metres: number | null | undefined) => string;
  weightUnit: string;
  heightUnit: string;
  /** Turns a typed weight back into kg for storage. */
  toKg: (value: number) => number;
}

const KEY = "wellness.units";
const Ctx = createContext<UnitsValue | null>(null);

const n = (v: number | string | null | undefined) => (v == null ? null : Number(v));

/**
 * Display units.
 *
 * Everything is STORED metric --- kg, cm, ml, metres --- because the nutrition
 * and MET formulas are defined in those terms and converting at rest would
 * bake rounding error into the data. Only the presentation layer converts, and
 * input converts straight back on the way in.
 */
export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [system, setSys] = useState<UnitSystem>("metric");

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => { if (v === "metric" || v === "imperial") setSys(v); }).catch(() => {});
  }, []);

  const setSystem = useCallback((s: UnitSystem) => {
    setSys(s);
    AsyncStorage.setItem(KEY, s).catch(() => {});
  }, []);

  const value = useMemo<UnitsValue>(() => {
    const imperial = system === "imperial";
    return {
      system,
      setSystem,
      weightUnit: imperial ? "lb" : "kg",
      heightUnit: imperial ? "ft" : "cm",
      weight: (v, digits = 1) => {
        const kg = n(v);
        if (kg == null) return "—";
        return imperial ? `${(kg * 2.20462).toFixed(digits)} lb` : `${kg.toFixed(digits)} kg`;
      },
      height: (v) => {
        const cm = n(v);
        if (cm == null) return "—";
        if (!imperial) return `${Math.round(cm)} cm`;
        const inches = cm / 2.54;
        return `${Math.floor(inches / 12)}′ ${Math.round(inches % 12)}″`;
      },
      volume: (ml) => {
        if (ml == null) return "—";
        return imperial ? `${(ml / 29.5735).toFixed(0)} fl oz` : ml >= 1000 ? `${(ml / 1000).toFixed(1)} L` : `${ml} ml`;
      },
      distance: (m) => {
        if (m == null) return "—";
        return imperial ? `${(m / 1609.34).toFixed(2)} mi` : m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
      },
      toKg: (v) => (imperial ? v / 2.20462 : v),
    };
  }, [system, setSystem]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUnits() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUnits must be used inside UnitsProvider");
  return ctx;
}
