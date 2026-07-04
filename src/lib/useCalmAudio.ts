import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { BedId, bedById } from './calmSounds';

/**
 * Manages the Calm session soundscape: a looping ambient bed plus optional
 * spoken breath cues. The bed fades in/out so starting and stopping never
 * feels abrupt. Audio is configured to keep playing when the phone is on
 * silent (expected behaviour for a meditation experience).
 */
export function useCalmAudio() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const loadedBedRef = useRef<BedId | null>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});

    return () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
      Speech.stop();
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  const clearFade = () => {
    if (fadeRef.current) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }
  };

  /** Smoothly ramp the current sound's volume to `target` over `ms`. */
  const fadeTo = (target: number, ms: number, onDone?: () => void) => {
    const sound = soundRef.current;
    if (!sound) {
      onDone?.();
      return;
    }
    clearFade();
    const steps = 16;
    const stepMs = Math.max(ms / steps, 16);
    let i = 0;
    let start = 0;
    sound.getStatusAsync().then((s) => {
      start = s.isLoaded ? s.volume ?? 0 : 0;
    });
    fadeRef.current = setInterval(() => {
      i += 1;
      const v = start + (target - start) * (i / steps);
      soundRef.current?.setVolumeAsync(Math.max(0, Math.min(1, v))).catch(() => {});
      if (i >= steps) {
        clearFade();
        onDone?.();
      }
    }, stepMs);
  };

  /** Load (if needed) and fade the chosen bed in. Pass 'off' for silence. */
  const startBed = async (bedId: BedId) => {
    const bed = bedById(bedId);
    if (!bed.module) {
      await stopBed();
      return;
    }
    // Reuse the loaded sound if it's already the right bed.
    if (soundRef.current && loadedBedRef.current === bedId) {
      clearFade();
      await soundRef.current.setVolumeAsync(0).catch(() => {});
      await soundRef.current.playAsync().catch(() => {});
      fadeTo(0.7, 1400);
      return;
    }
    // Different bed: tear down the old one first.
    await soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    try {
      const { sound } = await Audio.Sound.createAsync(
        bed.module,
        { isLooping: true, volume: 0, shouldPlay: true },
      );
      soundRef.current = sound;
      loadedBedRef.current = bedId;
      fadeTo(0.7, 1400);
    } catch {
      soundRef.current = null;
    }
  };

  /** Fade out and pause the bed (kept loaded for a quick restart). */
  const pauseBed = async () => {
    const sound = soundRef.current;
    if (!sound) return;
    fadeTo(0, 700, () => {
      soundRef.current?.pauseAsync().catch(() => {});
    });
  };

  /** Fade out and fully unload the bed. */
  const stopBed = async () => {
    clearFade();
    const sound = soundRef.current;
    if (!sound) return;
    fadeTo(0, 500, () => {
      soundRef.current?.stopAsync().catch(() => {});
    });
  };

  /** Speak a short breath cue in a calm, slow voice. */
  const speakCue = (text: string) => {
    Speech.stop();
    Speech.speak(text, { rate: 0.72, pitch: 0.92 });
  };

  const stopSpeaking = () => Speech.stop();

  return { startBed, pauseBed, stopBed, speakCue, stopSpeaking };
}
