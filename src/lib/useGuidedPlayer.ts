import { useEffect, useRef, useState } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { bedById } from './calmSounds';
import { GuidedSession, pickTake } from './calmSessions';

export type GuidedState = {
  activeId: string | null;
  isPlaying: boolean;
  /** 0..1 progress through the current track. */
  progress: number;
  positionMs: number;
  durationMs: number;
};

const IDLE: GuidedState = {
  activeId: null,
  isPlaying: false,
  progress: 0,
  positionMs: 0,
  durationMs: 0,
};

/**
 * Plays a guided voice meditation (a random take) with its ambient bed mixed
 * softly underneath, and reports live progress. One session plays at a time.
 */
export function useGuidedPlayer() {
  const voiceRef = useRef<Audio.Sound | null>(null);
  const bedRef = useRef<Audio.Sound | null>(null);
  const [state, setState] = useState<GuidedState>(IDLE);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});
    return () => {
      voiceRef.current?.unloadAsync().catch(() => {});
      bedRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const teardown = async () => {
    const v = voiceRef.current;
    const b = bedRef.current;
    voiceRef.current = null;
    bedRef.current = null;
    await v?.unloadAsync().catch(() => {});
    await b?.unloadAsync().catch(() => {});
  };

  const onStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.didJustFinish) {
      stop();
      return;
    }
    const durationMs = status.durationMillis ?? 0;
    const positionMs = status.positionMillis ?? 0;
    setState((s) => ({
      ...s,
      isPlaying: status.isPlaying,
      positionMs,
      durationMs,
      progress: durationMs > 0 ? Math.min(positionMs / durationMs, 1) : 0,
    }));
  };

  const play = async (session: GuidedSession) => {
    const take = pickTake(session);
    if (!take) return; // locked / coming soon

    await teardown();

    try {
      const bed = bedById(session.bed);
      if (bed.module) {
        const { sound } = await Audio.Sound.createAsync(bed.module, {
          isLooping: true,
          volume: 0.3,
          shouldPlay: true,
        });
        bedRef.current = sound;
      }

      const { sound: voice } = await Audio.Sound.createAsync(
        take,
        { shouldPlay: true, volume: 1 },
        onStatus,
      );
      voiceRef.current = voice;
      setState({ activeId: session.id, isPlaying: true, progress: 0, positionMs: 0, durationMs: 0 });
    } catch {
      await teardown();
      setState(IDLE);
    }
  };

  const togglePlay = async () => {
    const voice = voiceRef.current;
    const bed = bedRef.current;
    if (!voice) return;
    const status = await voice.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await voice.pauseAsync().catch(() => {});
      await bed?.pauseAsync().catch(() => {});
      setState((s) => ({ ...s, isPlaying: false }));
    } else {
      await voice.playAsync().catch(() => {});
      await bed?.playAsync().catch(() => {});
      setState((s) => ({ ...s, isPlaying: true }));
    }
  };

  const stop = async () => {
    await teardown();
    setState(IDLE);
  };

  return { state, play, togglePlay, stop };
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
