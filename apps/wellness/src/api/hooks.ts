import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./client";

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Minimal data hook. Deliberately not react-query: the screens need fetch,
 * loading, error and refetch, and nothing here benefits from a cache layer
 * big enough to justify the dependency in a mobile bundle.
 *
 * `path` null skips the request entirely, which is how a screen waits for a
 * prerequisite (a thread id, a signed-in user) without a second code path.
 */
export function useApi<T>(path: string | null, deps: unknown[] = []): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Guards against a slow response for an old date landing after a new one.
  const latest = useRef(0);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    const seq = ++latest.current;
    setLoading(true);
    setError(null);

    api<T>(path)
      .then((res) => {
        if (seq === latest.current) setData(res);
      })
      .catch((e) => {
        if (seq !== latest.current) return;
        setError(e instanceof ApiError ? e.message : "Could not reach the server");
        setData(null);
      })
      .finally(() => {
        if (seq === latest.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);

  return { data, loading, error, refetch: useCallback(() => setTick((t) => t + 1), []) };
}

/** For POST/PATCH from a screen: tracks busy and error around one action. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, run, clearError: useCallback(() => setError(null), []) };
}

/** YYYY-MM-DD in the device's own timezone, not UTC --- a log made at 11pm
 *  belongs to that day for the member, whatever UTC thinks. */
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
