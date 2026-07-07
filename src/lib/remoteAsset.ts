import * as FileSystem from 'expo-file-system';
import { ImageSourcePropType } from 'react-native';

/**
 * Media assets live in Supabase Storage (buckets `solace_voices` for audio and
 * `solace_images` for backgrounds) instead of the app bundle, keeping the binary
 * small.
 *
 * Audio strategy — start fast, keep offline:
 *   - If a file is already cached on the device, play the local copy (instant, offline).
 *   - Otherwise play the remote URL directly. expo-av streams and buffers it, so
 *     playback starts in about a second instead of waiting for a full download —
 *     and a background download caches it so the *next* play is instant/offline.
 *   - `prefetch*` eagerly downloads files (e.g. practice sounds) so they're saved
 *     in the app ahead of time.
 *
 * Images are returned as a remote `{ uri }`; React Native's <Image> caches them.
 */

const BASE = 'https://nhkszwctydlsxadpbahx.supabase.co/storage/v1/object/public';

/** Remote URL for an object in a public bucket. */
export function publicUrl(bucket: 'solace_voices' | 'solace_images', name: string): string {
  return `${BASE}/${bucket}/${encodeURIComponent(name)}`;
}

/** A remote image source for <Image>/ImageBackground (RN handles caching). */
export function remoteImage(name: string): ImageSourcePropType {
  return { uri: publicUrl('solace_images', name) };
}

const AUDIO_DIR = `${FileSystem.cacheDirectory}solace-audio/`;
const localPath = (name: string) => `${AUDIO_DIR}${name}`;

let dirReady: Promise<void> | null = null;
function ensureDir(): Promise<void> {
  if (!dirReady) {
    dirReady = FileSystem.getInfoAsync(AUDIO_DIR)
      .then((info) => {
        if (!info.exists) return FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
      })
      .catch(() => {});
  }
  return dirReady;
}

/** In-flight downloads, so we never download the same file twice at once. */
const inflight = new Map<string, Promise<unknown>>();

/** True if the file is already fully cached on the device. */
export async function isAudioCached(name: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(localPath(name));
    return info.exists && (info.size ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Download a voice file to the cache in the background (idempotent — no-op if it
 * is already cached or currently downloading). Never throws.
 */
export function prefetchAudio(name: string): Promise<unknown> {
  const local = localPath(name);
  const existing = inflight.get(local);
  if (existing) return existing;
  const job = (async () => {
    try {
      await ensureDir();
      if (await isAudioCached(name)) return;
      await FileSystem.downloadAsync(publicUrl('solace_voices', name), local);
    } catch {
      /* leave uncached; playback falls back to streaming */
    } finally {
      inflight.delete(local);
    }
  })();
  inflight.set(local, job);
  return job;
}

/** Eagerly cache a batch of voice files (e.g. practice music + beds). */
export async function prefetchAudioBatch(names: string[]): Promise<void> {
  for (const n of names) await prefetchAudio(n);
}

/**
 * The best source to play a voice file *now*: the local cached file if present,
 * otherwise the remote streaming URL (with a background download kicked off so
 * the next play is cached). Returns quickly either way.
 */
export async function audioSource(name: string): Promise<{ uri: string }> {
  try {
    if (await isAudioCached(name)) return { uri: localPath(name) };
  } catch {
    /* fall through to streaming */
  }
  prefetchAudio(name); // fire-and-forget cache for next time
  return { uri: publicUrl('solace_voices', name) };
}
