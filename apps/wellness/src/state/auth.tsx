import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearSession, saveSession, storedSession, type Session } from "../api/client";
import { themeFor, type Theme } from "../theme/tokens";
import { ThemeProvider, useTheme } from "./theme";

export type Role = "admin" | "coach" | "member";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
}

interface AuthValue {
  user: User | null;
  theme: Theme;
  /** null while the stored session is being checked, so routing can wait. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; role: Role }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore a session on launch so a returning member never sees the login
  // screen flash before being redirected past it.
  useEffect(() => {
    (async () => {
      try {
        if (await storedSession()) {
          const { user } = await api<{ user: User }>("/v1/auth/me");
          setUser(user);
        }
      } catch {
        await clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const adopt = useCallback(async (result: Session & { user: User }) => {
    await saveSession({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    setUser(result.user);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      // Must await: setUser triggers the redirect, and the destination screen
      // fetches immediately --- if the token is not persisted yet that first
      // request goes out unauthenticated.
      await adopt(await api<Session & { user: User }>("/v1/auth/login", { method: "POST", auth: false, body: { email, password } }));
    },
    [adopt],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; role: Role }) => {
      await adopt(await api<Session & { user: User }>("/v1/auth/register", { method: "POST", auth: false, body: input }));
    },
    [adopt],
  );

  const signOut = useCallback(async () => {
    const session = await storedSession();
    if (session) {
      // Best effort: revoke server-side, but always clear locally.
      await api("/v1/auth/logout", { method: "POST", auth: false, body: { refreshToken: session.refreshToken } }).catch(() => {});
    }
    await clearSession();
    setUser(null);
  }, []);

  // ThemeProvider sits INSIDE so it can read the role, and the inner component
  // reads the resolved scheme back out. Splitting it this way keeps a single
  // `useAuth().theme` for every screen.
  return (
    <ThemeProvider role={user?.role ?? "member"}>
      <WithTheme user={user} loading={loading} signIn={signIn} register={register} signOut={signOut}>
        {children}
      </WithTheme>
    </ThemeProvider>
  );
}

function WithTheme({
  user, loading, signIn, register, signOut, children,
}: Omit<AuthValue, "theme"> & { children: React.ReactNode }) {
  const { scheme } = useTheme();
  const value = useMemo<AuthValue>(
    () => ({ user, theme: themeFor(user?.role ?? "member", scheme), loading, signIn, register, signOut }),
    [user, scheme, loading, signIn, register, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
