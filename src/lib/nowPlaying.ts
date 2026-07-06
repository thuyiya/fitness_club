import { Image, ImageSourcePropType, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

/**
 * Drives the iOS system Now Playing widget (the standard media card) for the
 * Calm player. expo-av handles the audio; this just tells iOS what to show and
 * routes the Lock-Screen / Control-Center transport buttons back to the active
 * player. Every call is a no-op when the native module is absent (Android, Expo
 * Go), so callers don't need their own guards.
 */

type NativeNowPlaying = {
  setInfo(
    title: string,
    artist: string,
    artworkUri: string | null,
    duration: number,
    elapsed: number,
    isPlaying: boolean,
  ): void;
  updatePlayback(isPlaying: boolean, elapsed: number, duration: number): void;
  clear(): void;
  addListener(event: string, listener: (e: { type: string }) => void): { remove(): void };
};

const Native =
  Platform.OS === 'ios'
    ? requireOptionalNativeModule<NativeNowPlaying>('SolaceNowPlaying')
    : null;

type Handlers = {
  onToggle?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
};

let handlers: Handlers = {};
let subscribed = false;

function ensureSubscribed() {
  if (subscribed || !Native) return;
  subscribed = true;
  Native.addListener('remoteCommand', (e) => {
    switch (e.type) {
      case 'play':
        (handlers.onPlay ?? handlers.onToggle)?.();
        break;
      case 'pause':
        (handlers.onPause ?? handlers.onToggle)?.();
        break;
      case 'toggle':
        handlers.onToggle?.();
        break;
      case 'next':
        handlers.onNext?.();
        break;
      case 'previous':
        handlers.onPrev?.();
        break;
    }
  });
}

/** Register what the transport buttons do for the currently-playing session. */
export function setNowPlayingHandlers(h: Handlers): void {
  handlers = h;
  ensureSubscribed();
}

export function startNowPlaying(opts: {
  title: string;
  artist?: string;
  artwork?: ImageSourcePropType | null;
  durationSec?: number;
  elapsedSec?: number;
  isPlaying?: boolean;
}): void {
  if (!Native) return;
  let uri: string | null = null;
  try {
    if (opts.artwork != null) uri = Image.resolveAssetSource(opts.artwork)?.uri ?? null;
  } catch {
    /* ignore */
  }
  try {
    Native.setInfo(
      opts.title,
      opts.artist ?? '',
      uri,
      opts.durationSec ?? 0,
      opts.elapsedSec ?? 0,
      opts.isPlaying ?? true,
    );
  } catch {
    /* ignore */
  }
}

export function updateNowPlaying(isPlaying: boolean, elapsedSec = 0, durationSec = 0): void {
  if (!Native) return;
  try {
    Native.updatePlayback(isPlaying, elapsedSec, durationSec);
  } catch {
    /* ignore */
  }
}

export function endNowPlaying(): void {
  handlers = {};
  if (!Native) return;
  try {
    Native.clear();
  } catch {
    /* ignore */
  }
}
