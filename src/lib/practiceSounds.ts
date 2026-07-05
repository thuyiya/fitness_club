import { AVPlaybackSource } from 'expo-av';

/**
 * Per-practice music. Each practice has its own set of variants; one is picked
 * at random every time the practice starts, so repeat sessions feel fresh and
 * each practice sounds distinct (instead of sharing one ambient bed). Drop more
 * `music-<id>-N.mp3` files into assets/audio and add them here.
 */
const MUSIC: Record<string, AVPlaybackSource[]> = {
  breath: [
    require('../../assets/audio/music-breath-1.mp3'),
    require('../../assets/audio/music-breath-2.mp3'),
  ],
  focus: [
    require('../../assets/audio/music-focus-1.mp3'),
    require('../../assets/audio/music-focus-2.mp3'),
  ],
  body: [
    require('../../assets/audio/music-body-1.mp3'),
    require('../../assets/audio/music-body-2.mp3'),
  ],
  metta: [
    require('../../assets/audio/music-metta-1.mp3'),
    require('../../assets/audio/music-metta-2.mp3'),
  ],
  letgo: [
    require('../../assets/audio/music-letgo-1.mp3'),
  ],
};

/** A random music variant for a practice, or null if it has none. */
export function pickPracticeMusic(practiceId: string): AVPlaybackSource | null {
  const variants = MUSIC[practiceId];
  if (!variants || variants.length === 0) return null;
  return variants[Math.floor(Math.random() * variants.length)];
}

/**
 * Background scenes per practice — one is picked at random each play (paired
 * with the random music) so a session looks and sounds different every time.
 */
const IMAGES: Record<string, number[]> = {
  breath: [
    require('../../assets/bg/bg-breath-1.jpg'),
    require('../../assets/bg/bg-breath-2.jpg'),
  ],
  focus: [
    require('../../assets/bg/bg-focus-1.jpg'),
    require('../../assets/bg/bg-focus-2.jpg'),
  ],
  body: [
    require('../../assets/bg/bg-body-1.jpg'),
    require('../../assets/bg/bg-body-2.jpg'),
    require('../../assets/bg/bg-body-3.jpg'),
  ],
  metta: [
    require('../../assets/bg/bg-metta-1.jpg'),
    require('../../assets/bg/bg-metta-2.jpg'),
    require('../../assets/bg/bg-metta-3.jpg'),
  ],
  letgo: [
    require('../../assets/bg/bg-letgo-1.jpg'),
    require('../../assets/bg/bg-letgo-2.jpg'),
    require('../../assets/bg/bg-letgo-3.jpg'),
    require('../../assets/bg/bg-letgo-4.jpg'),
  ],
};

/** A random background scene for a practice, or null if it has none. */
export function pickPracticeImage(practiceId: string): number | null {
  const imgs = IMAGES[practiceId];
  if (!imgs || imgs.length === 0) return null;
  return imgs[Math.floor(Math.random() * imgs.length)];
}
