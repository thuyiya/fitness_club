import { AVPlaybackSource } from 'expo-av';

/**
 * Ambient background beds for the Calm session. Each `module` is a static
 * `require()` so Metro bundles the audio file. To add / swap a track, drop the
 * MP3 into `assets/audio/` (see PROMPTS.md for the Suno prompts) and point the
 * matching entry here. The files shipped today are silent placeholders — replace
 * them with the generated tracks and everything keeps working with no code change.
 */
export type BedId = 'drift' | 'morning' | 'night' | 'aurora' | 'off';

export type Bed = {
  id: BedId;
  label: string;
  /** Undefined for the "off" option. */
  module?: AVPlaybackSource;
};

export const BEDS: Bed[] = [
  { id: 'drift', label: 'Drift', module: require('../../assets/audio/bed-drift.mp3') },
  { id: 'morning', label: 'Morning', module: require('../../assets/audio/bed-morning.mp3') },
  { id: 'night', label: 'Night', module: require('../../assets/audio/bed-night.mp3') },
  { id: 'aurora', label: 'Aurora', module: require('../../assets/audio/bed-aurora.mp3') },
  { id: 'off', label: 'Silent' },
];

export function bedById(id: BedId): Bed {
  return BEDS.find((b) => b.id === id) ?? BEDS[0];
}
