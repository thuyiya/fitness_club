import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * The quick-log sheet is opened from the tab bar, from a meal slot on Home and
 * from the Training screen. Keeping the open/close state here means the sheet
 * renders once above the tabs instead of once per screen --- and `version`
 * gives every screen a cheap signal to refetch after something is logged.
 */
interface QuickLogValue {
  open: (mode?: "menu" | "meal" | "exercise" | "activity" | "hydration", slot?: string) => void;
  close: () => void;
  visible: boolean;
  mode: "menu" | "meal" | "exercise" | "activity" | "hydration";
  slot: string;
  version: number;
  bumpVersion: () => void;
}

const Ctx = createContext<QuickLogValue | null>(null);

export function QuickLogProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<QuickLogValue["mode"]>("menu");
  const [slot, setSlot] = useState("lunch");
  const [version, setVersion] = useState(0);

  const value = useMemo<QuickLogValue>(
    () => ({
      visible, mode, slot, version,
      open: (m = "menu", s = "lunch") => { setMode(m); setSlot(s); setVisible(true); },
      close: () => setVisible(false),
      bumpVersion: () => setVersion((v) => v + 1),
    }),
    [visible, mode, slot, version],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuickLog() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQuickLog must be used inside QuickLogProvider");
  return ctx;
}
