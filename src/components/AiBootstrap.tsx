/**
 * Kicks off / reconnects the background model download when the app opens.
 *
 * On mount it reattaches to any download still running from a previous session,
 * then (per product decision) auto-starts the Wi-Fi-only download on first app
 * open. It also re-checks whenever the app returns to the foreground so the
 * progress UI catches up after the OS advanced the download while we were away.
 *
 * Renders nothing.
 */
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAiCoachStore } from '@/store/aiCoachStore';

export function AiBootstrap() {
  const reattach = useAiCoachStore((s) => s.reattach);
  const startAutoDownload = useAiCoachStore((s) => s.startAutoDownload);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      // Reconnect to an in-flight OS download first; if none, auto-start it.
      await reattach();
      startAutoDownload();
    })();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void reattach();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
