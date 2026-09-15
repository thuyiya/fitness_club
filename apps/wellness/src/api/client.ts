import AsyncStorage from "@react-native-async-storage/async-storage";

import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Where the API lives, resolved per platform.
 *
 * `localhost` means something different on every target, and getting it wrong
 * is the single most common reason a first run appears to hang:
 *   - web and the iOS simulator share the host's loopback, so localhost works
 *   - the ANDROID EMULATOR is its own virtual machine; localhost is the
 *     emulator itself, and the host is reachable only at 10.0.2.2
 *   - a physical device shares neither, and needs the host's LAN address
 *
 * Rather than making everyone set an env var, the LAN address is taken from
 * the Expo dev server the app was loaded from --- if Metro could reach this
 * device, so can the API on the same host.
 */
function resolveApiUrl(): string {
  // An explicit override always wins; this is what production builds set.
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  const port = process.env.EXPO_PUBLIC_API_PORT ?? "3001";

  if (Platform.OS === "web") return `http://localhost:${port}`;

  // e.g. "192.168.1.42:8081" in dev, undefined in a production build.
  const host = (Constants.expoConfig as { hostUri?: string } | null)?.hostUri?.split(":")[0];

  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:${port}`;
  }
  // Loopback dev server: fine for iOS, never for the Android emulator.
  return Platform.OS === "android" ? `http://10.0.2.2:${port}` : `http://localhost:${port}`;
}

export const API_URL = resolveApiUrl();

const ACCESS_KEY = "wellness.accessToken";
const REFRESH_KEY = "wellness.refreshToken";

export interface Session {
  accessToken: string;
  refreshToken: string;
}

export const storedSession = async (): Promise<Session | null> => {
  const [accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(ACCESS_KEY),
    AsyncStorage.getItem(REFRESH_KEY),
  ]);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
};

export const saveSession = async (s: Session) => {
  await AsyncStorage.multiSet([[ACCESS_KEY, s.accessToken], [REFRESH_KEY, s.refreshToken]]);
};

export const clearSession = () => AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

let refreshing: Promise<Session | null> | null = null;

/**
 * Refreshes at most once concurrently. Without this, a screen firing four
 * requests on mount with an expired token would burn four refresh tokens and
 * --- because rotation revokes each on use --- log the member out.
 */
async function refreshSession(): Promise<Session | null> {
  refreshing ??= (async () => {
    const current = await storedSession();
    if (!current) return null;
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!res.ok) {
      await clearSession();
      return null;
    }
    const next = (await res.json()) as Session;
    await saveSession(next);
    return next;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const send = async (token?: string) =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  let session = auth ? await storedSession() : null;
  let res = await send(session?.accessToken);

  // Access tokens live 15 minutes; a silent refresh is the normal path, not an
  // error case. Only a failed refresh surfaces as a 401 to the caller.
  if (res.status === 401 && auth) {
    session = await refreshSession();
    if (session) res = await send(session.accessToken);
  }

  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, payload?.error ?? "unknown", payload?.message ?? res.statusText);
  }
  return payload as T;
}
