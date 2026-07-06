import { create } from 'zustand';
import {
  Audio,
  AVPlaybackStatus,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';
import { bedById } from './calmSounds';
import { GuidedSession, pickTake } from './calmSessions';
import {
  endNowPlaying,
  setNowPlayingHandlers,
  startNowPlaying,
  updateNowPlaying,
} from './nowPlaying';

/**
 * Global guided-meditation player. Sound handles live at module scope and state
 * lives in a zustand store, so playback is shared across the Calm list, the
 * full-screen player and the mini player — and keeps running in the background
 * (like a music app) once the audio session is configured for it.
 */

let voice: Audio.Sound | null = null;
let bed: Audio.Sound | null = null;
let configured = false;

async function configureAudio() {
  if (configured) return;
  configured = true;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true, // keep playing when the app is backgrounded
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: true,
  }).catch(() => {});
}

export type GuidedState = {
  activeId: string | null;
  isPlaying: boolean;
  /** 0..1 progress through the current track. */
  progress: number;
  positionMs: number;
  durationMs: number;
};

type PlayerStore = GuidedState & {
  play: (session: GuidedSession) => Promise<void>;
  togglePlay: () => Promise<void>;
  stop: () => Promise<void>;
};

const IDLE: GuidedState = {
  activeId: null,
  isPlaying: false,
  progress: 0,
  positionMs: 0,
  durationMs: 0,
};

async function teardown() {
  const v = voice;
  const b = bed;
  voice = null;
  bed = null;
  await v?.unloadAsync().catch(() => {});
  await b?.unloadAsync().catch(() => {});
}

export const usePlayerStore = create<PlayerStore>((set, get) => {
  const onStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.didJustFinish) {
      get().stop();
      return;
    }
    const durationMs = status.durationMillis ?? 0;
    const positionMs = status.positionMillis ?? 0;
    set({
      isPlaying: status.isPlaying,
      positionMs,
      durationMs,
      progress: durationMs > 0 ? Math.min(positionMs / durationMs, 1) : 0,
    });
    // Keep the system Now Playing scrubber in sync with the real audio.
    updateNowPlaying(status.isPlaying, positionMs / 1000, durationMs / 1000);
  };

  return {
    ...IDLE,
    play: async (session) => {
      const take = pickTake(session);
      if (!take) return; // locked / coming soon

      await configureAudio();
      await teardown();

      try {
        const b = bedById(session.bed);
        if (b.module) {
          const { sound } = await Audio.Sound.createAsync(b.module, {
            isLooping: true,
            volume: 0.3,
            shouldPlay: true,
          });
          bed = sound;
        }
        const { sound } = await Audio.Sound.createAsync(
          take,
          { shouldPlay: true, volume: 1 },
          onStatus,
        );
        voice = sound;
        set({ activeId: session.id, isPlaying: true, progress: 0, positionMs: 0, durationMs: 0 });
        startNowPlaying({
          title: session.title,
          artist: session.technique,
          artwork: session.image,
          isPlaying: true,
        });
        setNowPlayingHandlers({ onToggle: () => get().togglePlay() });
      } catch {
        await teardown();
        set(IDLE);
      }
    },
    togglePlay: async () => {
      if (!voice) return;
      const status = await voice.getStatusAsync();
      if (!status.isLoaded) return;
      const { positionMs, durationMs } = get();
      if (status.isPlaying) {
        await voice.pauseAsync().catch(() => {});
        await bed?.pauseAsync().catch(() => {});
        set({ isPlaying: false });
        updateNowPlaying(false, positionMs / 1000, durationMs / 1000);
      } else {
        await voice.playAsync().catch(() => {});
        await bed?.playAsync().catch(() => {});
        set({ isPlaying: true });
        updateNowPlaying(true, positionMs / 1000, durationMs / 1000);
      }
    },
    stop: async () => {
      await teardown();
      set(IDLE);
      endNowPlaying();
    },
  };
});

/** Backwards-compatible hook shape: `{ state, play, togglePlay, stop }`. */
export function useGuidedPlayer() {
  const activeId = usePlayerStore((s) => s.activeId);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const play = usePlayerStore((s) => s.play);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const stop = usePlayerStore((s) => s.stop);
  return {
    state: { activeId, isPlaying, progress, positionMs, durationMs },
    play,
    togglePlay,
    stop,
  };
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
