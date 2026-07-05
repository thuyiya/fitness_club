import { ImageSourcePropType } from 'react-native';
import { AVPlaybackSource } from 'expo-av';
import { BedId } from './calmSounds';

/**
 * Guided voice meditations for the Calm "Journeys" tab. Each enabled session
 * ships with two narrated takes; one is chosen at random each time it plays so
 * repeat listens stay fresh. Sessions without `takes` render as "coming soon".
 * Scripts live in `assets/audio/scripts/`.
 */
export type GuidedSession = {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  technique: string;
  /** Ambient bed layered softly underneath the voice. */
  bed: BedId;
  accent: string;
  /** Full-screen scene shown behind the player, chosen to match the journey. */
  image: ImageSourcePropType;
  /** Two narrated takes; omitted → session shown as locked / coming soon. */
  takes?: AVPlaybackSource[];
};

export const GUIDED_SESSIONS: GuidedSession[] = [
  {
    id: 'breath',
    title: 'Settle the Mind',
    subtitle: 'Mindfulness of breathing to arrive and soften',
    duration: '5 min',
    technique: 'Anapanasati',
    bed: 'drift',
    accent: '#6C86D9',
    image: require('../../assets/bg/bg-breath.jpg'),
    takes: [
      require('../../assets/audio/voice-breath-1.mp3'),
      require('../../assets/audio/voice-breath-2.mp3'),
    ],
  },
  {
    id: 'bodyscan',
    title: 'Release the Body',
    subtitle: 'A slow scan to let go of held tension',
    duration: '7 min',
    technique: 'Body scan',
    bed: 'morning',
    accent: '#4BA3A0',
    image: require('../../assets/bg/bg-bodyscan.jpg'),
    takes: [
      require('../../assets/audio/voice-bodyscan-1.mp3'),
      require('../../assets/audio/voice-bodyscan-2.mp3'),
    ],
  },
  {
    id: 'thoughts',
    title: 'Quiet a Racing Mind',
    subtitle: 'Rest as the open sky and let thoughts pass',
    duration: '6 min',
    technique: 'Letting go',
    bed: 'drift',
    accent: '#9385D0',
    image: require('../../assets/bg/bg-thoughts.jpg'),
    takes: [
      require('../../assets/audio/voice-thoughts-1.mp3'),
      require('../../assets/audio/voice-thoughts-2.mp3'),
    ],
  },
  {
    id: 'problem',
    title: 'Think Clearly',
    subtitle: 'Meet a problem with a still, spacious mind',
    duration: '8 min',
    technique: 'Equanimity',
    bed: 'drift',
    accent: '#8A78C9',
    image: require('../../assets/bg/bg-problem.jpg'),
  },
  {
    id: 'metta',
    title: 'Soften the Heart',
    subtitle: 'Loving-kindness for yourself and others',
    duration: '7 min',
    technique: 'Metta',
    bed: 'morning',
    accent: '#C58BC0',
    image: require('../../assets/bg/bg-metta.jpg'),
  },
  {
    id: 'sleep',
    title: 'The Lantern on the Mountain',
    subtitle: 'A drifting bedtime story to fall asleep',
    duration: '12 min',
    technique: 'Sleep story',
    bed: 'night',
    accent: '#5E7CC0',
    image: require('../../assets/bg/bg-sleep.jpg'),
  },
];

/** Pick a random narrated take for a session (or null if none / locked). */
export function pickTake(session: GuidedSession): AVPlaybackSource | null {
  if (!session.takes || session.takes.length === 0) return null;
  const i = Math.floor(Math.random() * session.takes.length);
  return session.takes[i];
}
