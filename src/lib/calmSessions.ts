import { ImageSourcePropType } from 'react-native';
import { BedId } from './calmSounds';
import { remoteImage } from './remoteAsset';

/**
 * Guided voice content for the Calm tab. Two groups, both driven by this list:
 *   - category: 'meditation' → "Guided journeys" (narrated Buddhist practices)
 *   - category: 'story'      → "Sleep & morning stories"
 *
 * Each script in `assets/audio/scripts/` has exactly one session here. A session
 * plays only once its narrated `takes` are added; sessions without `takes` render
 * as locked / "Soon". Meditations ship with two takes (one chosen at random each
 * play so repeat listens stay fresh); stories use a single take.
 *
 * `takes` and `image` reference filenames in Supabase Storage (buckets
 * `solace_voices` and `solace_images`); audio is downloaded + cached on first
 * play. The canonical filenames are listed in `assets/audio/scripts/AUDIO_MAP.md`.
 */
export type GuidedSession = {
  id: string;
  /** Which list the session appears in. */
  category: 'meditation' | 'story';
  title: string;
  subtitle: string;
  duration: string;
  technique: string;
  /** Source script under assets/audio/scripts (for traceability). */
  script: string;
  /** Ambient bed layered softly underneath the voice. */
  bed: BedId;
  accent: string;
  /** Full-screen scene shown behind the player, chosen to match the journey. */
  image: ImageSourcePropType;
  /** Narrated take filenames (solace_voices bucket); omitted → locked / coming soon. */
  takes?: string[];
};

export const GUIDED_SESSIONS: GuidedSession[] = [
  /* ---- Guided journeys (14 — one per numbered script) ---- */
  {
    id: 'breath',
    category: 'meditation',
    title: 'Settle the Mind',
    subtitle: 'Mindfulness of breathing to arrive and soften',
    duration: '5 min',
    technique: 'Anapanasati',
    script: '01-breath.md',
    bed: 'drift',
    accent: '#6C86D9',
    image: remoteImage('bg-breath.jpg'),
    takes: ['voice-breath-1.mp3', 'voice-breath-2.mp3'],
  },
  {
    id: 'bodyscan',
    category: 'meditation',
    title: 'Release the Body',
    subtitle: 'A slow scan to let go of held tension',
    duration: '7 min',
    technique: 'Body scan',
    script: '02-body-scan.md',
    bed: 'morning',
    accent: '#4BA3A0',
    image: remoteImage('bg-bodyscan.jpg'),
    takes: ['voice-bodyscan-1.mp3', 'voice-bodyscan-2.mp3'],
  },
  {
    id: 'thoughts',
    category: 'meditation',
    title: 'Quiet a Racing Mind',
    subtitle: 'Rest as the open sky and let thoughts pass',
    duration: '6 min',
    technique: 'Letting go',
    script: '03-letting-go-thoughts.md',
    bed: 'drift',
    accent: '#9385D0',
    image: remoteImage('bg-thoughts.jpg'),
    takes: ['voice-thoughts-1.mp3', 'voice-thoughts-2.mp3'],
  },
  {
    id: 'problem',
    category: 'meditation',
    title: 'Think Clearly',
    subtitle: 'Meet a problem with a still, spacious mind',
    duration: '8 min',
    technique: 'Equanimity',
    script: '04-problem-solving.md',
    bed: 'drift',
    accent: '#8A78C9',
    image: remoteImage('bg-problem.jpg'),
    takes: ['voice-problem-1.mp3', 'voice-problem-2.mp3'],
  },
  {
    id: 'metta',
    category: 'meditation',
    title: 'Soften the Heart',
    subtitle: 'Loving-kindness for yourself and others',
    duration: '7 min',
    technique: 'Metta',
    script: '05-loving-kindness.md',
    bed: 'morning',
    accent: '#C58BC0',
    image: remoteImage('bg-metta.jpg'),
    takes: ['voice-metta-1.mp3', 'voice-metta-2.mp3'],
  },
  {
    id: 'sleep',
    category: 'meditation',
    title: 'The Lantern on the Mountain',
    subtitle: 'A drifting bedtime meditation to fall asleep',
    duration: '12 min',
    technique: 'Sleep',
    script: '06-sleep-story.md',
    bed: 'night',
    accent: '#5E7CC0',
    image: remoteImage('bg-sleep.jpg'),
  },
  {
    id: 'miracle',
    category: 'meditation',
    title: 'The Miracle of This Moment',
    subtitle: 'Wake to the aliveness of right now',
    duration: '6 min',
    technique: 'Insight',
    script: '07-the-miracle-of-this-moment.md',
    bed: 'drift',
    accent: '#6FA8C7',
    image: remoteImage('bg-breath.jpg'),
    takes: ['voice-miracle-1.mp3', 'voice-miracle-2.mp3'],
  },
  {
    id: 'circle',
    category: 'meditation',
    title: 'The Circle Has No Beginning',
    subtitle: 'Rest in the flow of cause and effect',
    duration: '6 min',
    technique: 'Insight',
    script: '08-circle.md',
    bed: 'drift',
    accent: '#7E9BD4',
    image: remoteImage('bg-thoughts.jpg'),
    takes: ['voice-circle-1.mp3', 'voice-circle-2.mp3'],
  },
  {
    id: 'paints',
    category: 'meditation',
    title: 'The Mind That Paints the World',
    subtitle: 'See how perception colours everything',
    duration: '6 min',
    technique: 'Insight',
    script: '09-the-mind-that-paints-the-world.md',
    bed: 'drift',
    accent: '#A08AD0',
    image: remoteImage('bg-thoughts.jpg'),
  },
  {
    id: 'rope',
    category: 'meditation',
    title: 'The Rope That Was Never There',
    subtitle: 'Loosen the grip of imagined helplessness',
    duration: '7 min',
    technique: 'Insight',
    script: '10-helplessness-is-only-in-our-mind.md',
    bed: 'drift',
    accent: '#7C93C2',
    image: remoteImage('bg-problem.jpg'),
  },
  {
    id: 'enough',
    category: 'meditation',
    title: 'The Secret of Enough',
    subtitle: 'Find contentment that does not depend on more',
    duration: '7 min',
    technique: 'Contentment',
    script: '11-satisfaction.md',
    bed: 'morning',
    accent: '#C89AB4',
    image: remoteImage('bg-metta.jpg'),
  },
  {
    id: 'change',
    category: 'meditation',
    title: 'Everything Changes',
    subtitle: 'Make peace with impermanence',
    duration: '7 min',
    technique: 'Impermanence',
    script: '12-impermanence.md',
    bed: 'drift',
    accent: '#6E8FB8',
    image: remoteImage('bg-sleep.jpg'),
  },
  {
    id: 'wisdom',
    category: 'meditation',
    title: 'The Cup We Keep Filling',
    subtitle: 'Empty out to make room for wisdom',
    duration: '8 min',
    technique: 'Wisdom',
    script: '13-wisdom.md',
    bed: 'morning',
    accent: '#8E86C6',
    image: remoteImage('bg-problem.jpg'),
  },
  {
    id: 'focus',
    category: 'meditation',
    title: 'Focus',
    subtitle: 'Gather a scattered mind to a single point',
    duration: '6 min',
    technique: 'Samatha',
    script: '14-focus-samatha.md',
    bed: 'morning',
    accent: '#5FA6A0',
    image: remoteImage('bg-focus-1.jpg'),
  },

  /* ---- Sleep & morning stories (6) ---- */
  {
    id: 'stars',
    category: 'story',
    title: 'The River of Stars',
    subtitle: 'Drift downstream beneath a sky of light',
    duration: '10 min',
    technique: 'Sleep story',
    script: 'story/bedtime/01-music-letgo.md',
    bed: 'night',
    accent: '#4E6CB0',
    image: remoteImage('bg-sleep.jpg'),
  },
  {
    id: 'teahouse',
    category: 'story',
    title: 'The Little Teahouse at the End of the Forest',
    subtitle: 'A warm, quiet place to let the day go',
    duration: '12 min',
    technique: 'Sleep story',
    script: 'story/bedtime/02-teahouse.md',
    bed: 'night',
    accent: '#7A6DB2',
    image: remoteImage('bg-sleep.jpg'),
  },
  {
    id: 'cloud',
    category: 'story',
    title: "The Little Cloud Who Couldn't Hurry",
    subtitle: 'A gentle tale about letting things unfold',
    duration: '10 min',
    technique: 'Sleep story',
    script: 'story/bedtime/03-littlecloud.md',
    bed: 'night',
    accent: '#6FA0C8',
    image: remoteImage('bg-sleep.jpg'),
  },
  {
    id: 'moonkeeper',
    category: 'story',
    title: "The Moon Keeper's Garden",
    subtitle: 'Tend a quiet garden under the moon',
    duration: '12 min',
    technique: 'Sleep story',
    script: 'story/bedtime/04-moonkeeper.md',
    bed: 'night',
    accent: '#5566A8',
    image: remoteImage('bg-sleep.jpg'),
  },
  {
    id: 'nighttrain',
    category: 'story',
    title: 'The Night Train to Morning',
    subtitle: 'A slow ride through the dark toward dawn',
    duration: '12 min',
    technique: 'Sleep story',
    script: 'story/bedtime/05-nighttrain.md',
    bed: 'night',
    accent: '#4C6699',
    image: remoteImage('bg-sleep.jpg'),
  },
  {
    id: 'beginagain',
    category: 'story',
    title: 'Begin Again',
    subtitle: 'A soft, hopeful start to the morning',
    duration: '8 min',
    technique: 'Morning',
    script: 'story/morning/01-morningbegin.md',
    bed: 'morning',
    accent: '#C7A86B',
    image: remoteImage('bg-metta.jpg'),
  },
];

/** Guided meditations only (the "journeys" list). */
export const MEDITATION_SESSIONS = GUIDED_SESSIONS.filter((s) => s.category === 'meditation');

/** Sleep & morning stories. */
export const STORY_SESSIONS = GUIDED_SESSIONS.filter((s) => s.category === 'story');

/** Pick a random narrated take filename for a session (or null if none / locked). */
export function pickTake(session: GuidedSession): string | null {
  if (!session.takes || session.takes.length === 0) return null;
  const i = Math.floor(Math.random() * session.takes.length);
  return session.takes[i];
}
