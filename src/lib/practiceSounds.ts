import { ImageSourcePropType } from 'react-native';
import { remoteImage } from './remoteAsset';

/**
 * Per-practice music. Each practice has its own set of variants; one is picked
 * at random every time the practice starts, so repeat sessions feel fresh and
 * each practice sounds distinct. Values are MP3 filenames in the Supabase
 * `solace_voices` bucket — the player caches them on first play.
 */
const MUSIC: Record<string, string[]> = {
  breath: ['music-breath-1.mp3', 'music-breath-2.mp3'],
  focus: ['music-focus-1.mp3', 'music-focus-2.mp3'],
  body: ['music-body-1.mp3', 'music-body-2.mp3'],
  metta: ['music-metta-1.mp3', 'music-metta-2.mp3'],
  letgo: ['music-letgo-1.mp3'],
};

/** A random music filename for a practice, or null if it has none. */
export function pickPracticeMusic(practiceId: string): string | null {
  const variants = MUSIC[practiceId];
  if (!variants || variants.length === 0) return null;
  return variants[Math.floor(Math.random() * variants.length)];
}

/**
 * Background scenes per practice — one is picked at random each play (paired
 * with the random music) so a session looks and sounds different every time.
 * Backgrounds live in the Supabase `solace_images` bucket.
 */
const IMAGES: Record<string, ImageSourcePropType[]> = {
  breath: [remoteImage('bg-breath-1.jpg'), remoteImage('bg-breath-2.jpg')],
  focus: [remoteImage('bg-focus-1.jpg'), remoteImage('bg-focus-2.jpg')],
  body: [remoteImage('bg-body-1.jpg'), remoteImage('bg-body-2.jpg'), remoteImage('bg-body-3.jpg')],
  metta: [remoteImage('bg-metta-1.jpg'), remoteImage('bg-metta-2.jpg'), remoteImage('bg-metta-3.jpg')],
  letgo: [
    remoteImage('bg-letgo-1.jpg'),
    remoteImage('bg-letgo-2.jpg'),
    remoteImage('bg-letgo-3.jpg'),
    remoteImage('bg-letgo-4.jpg'),
  ],
};

/** A random background scene for a practice, or null if it has none. */
export function pickPracticeImage(practiceId: string): ImageSourcePropType | null {
  const imgs = IMAGES[practiceId];
  if (!imgs || imgs.length === 0) return null;
  return imgs[Math.floor(Math.random() * imgs.length)];
}
