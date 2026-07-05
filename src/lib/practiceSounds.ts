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
