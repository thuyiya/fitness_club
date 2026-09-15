import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * On a simulator or the web `localhost` reaches the host machine. On a real
 * device it does not, so EXPO_PUBLIC_API_URL must point at the machine's LAN
 * address --- the single most common reason a first run appears to hang.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

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
