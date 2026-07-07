/**
 * Ambient background beds for the Calm session. Each bed names an MP3 in the
 * Supabase `solace_voices` bucket; the player downloads + caches it on first use
 * (see `cachedAudio`). To add / swap a bed, upload the MP3 and point the matching
 * entry's `file` here.
 */
export type BedId = 'drift' | 'morning' | 'night' | 'aurora' | 'off';

export type Bed = {
  id: BedId;
  label: string;
  /** Filename in the solace_voices bucket. Undefined for the "off" option. */
  file?: string;
};

export const BEDS: Bed[] = [
  { id: 'drift', label: 'Drift', file: 'bed-drift.mp3' },
  { id: 'morning', label: 'Morning', file: 'bed-morning.mp3' },
  { id: 'night', label: 'Night', file: 'bed-night.mp3' },
  { id: 'aurora', label: 'Aurora', file: 'bed-aurora.mp3' },
  { id: 'off', label: 'Silent' },
];

export function bedById(id: BedId): Bed {
  return BEDS.find((b) => b.id === id) ?? BEDS[0];
}
