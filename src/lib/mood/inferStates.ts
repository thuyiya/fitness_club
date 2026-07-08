/**
 * Bridges the mood check-in data (valence/energy/emotion, from moodStore) to the
 * Buddhist mind-healing guidance vocabulary (MoodState, from mindGuidance). This
 * is what lets the on-device coach understand how the user feels and offer the
 * right practice — the connective tissue between the check-in and the knowledge base.
 */
import { MoodEntry, MoodEmotion } from '@/store/moodStore';
import { MoodState } from '@/lib/mindGuidance';

const EMOTION_TO_STATES: Record<MoodEmotion, MoodState[]> = {
  happy: ['joy'],
  calm: [],
  grateful: ['gratitude'],
  neutral: [],
  tired: ['low-energy'],
  anxious: ['anxiety', 'stress'],
  sad: ['sadness'],
  angry: ['anger'],
  hurting: ['grief', 'sadness'],
  numb: ['numbness'],
};

/**
 * Derives the guidance states for a single mood entry, combining its primary
 * emotion with signal from the valence/energy/intensity dials.
 */
export function inferStatesFromEntry(entry: MoodEntry): MoodState[] {
  const states = new Set<MoodState>(EMOTION_TO_STATES[entry.primary] ?? []);

  if (entry.valence <= -0.4) states.add('sadness');
  if (entry.energy <= 0.25) states.add('low-energy');
  if (entry.energy >= 0.8 && entry.valence < 0) states.add('restlessness');
  // Strong negative feeling that's hard to hold → overwhelm.
  if (entry.intensity >= 0.7 && entry.valence < -0.2) states.add('overwhelm');

  return Array.from(states);
}

/**
 * Convenience: the states for the user's most recent check-in, or [] if none.
 * Returns [] for clearly positive/neutral states so guidance is only injected
 * when there's something to gently work with.
 */
export function inferStatesFromLatest(latest: MoodEntry | undefined): MoodState[] {
  if (!latest) return [];
  return inferStatesFromEntry(latest);
}
