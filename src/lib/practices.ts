/**
 * Self-guided contemplative practices for the Calm "Practices" tab. Breath is
 * the interactive breathing player; the rest are gently timed prompt sequences
 * (a soft orb breathes on its own while the guidance cycles). Each is rooted in
 * a traditional Buddhist technique.
 */

export type PracticePhase = { label: string; seconds: number };
export type PracticeKind = 'breath' | 'guided';

export type Practice = {
  id: string;
  name: string;
  /** Traditional (Pāli) technique name. */
  technique: string;
  subtitle: string;
  /** Suggested length, shown on the card. */
  minutes: number;
  accent: string;
  kind: PracticeKind;
  /** Prompt sequence for guided practices (looped). */
  phases?: PracticePhase[];
};

export const PRACTICES: Practice[] = [
  {
    id: 'breath',
    name: 'Breath',
    technique: 'Ānāpānasati',
    subtitle: 'Follow the breath to arrive and settle',
    minutes: 5,
    accent: '#6C86D9',
    kind: 'breath',
  },
  {
    id: 'focus',
    name: 'Focus',
    technique: 'Samatha',
    subtitle: 'Steady, one-pointed attention',
    minutes: 6,
    accent: '#4B93C4',
    kind: 'guided',
    phases: [
      { label: 'Settle your gaze softly, or close your eyes', seconds: 12 },
      { label: 'Rest your attention on the breath at the nose', seconds: 18 },
      { label: 'When the mind wanders, gently notice', seconds: 16 },
      { label: 'Kindly return to the breath', seconds: 16 },
      { label: 'One breath… then the next', seconds: 16 },
      { label: 'Let the attention grow steady and bright', seconds: 18 },
    ],
  },
  {
    id: 'body',
    name: 'Relax the Body',
    technique: 'Kāyagatāsati',
    subtitle: 'A slow scan that releases tension',
    minutes: 7,
    accent: '#4BA3A0',
    kind: 'guided',
    phases: [
      { label: 'Take one long, slow breath out', seconds: 12 },
      { label: 'Soften the muscles of your face and jaw', seconds: 16 },
      { label: 'Let your shoulders drop away from your ears', seconds: 16 },
      { label: 'Relax your arms, all the way to the hands', seconds: 16 },
      { label: 'Soften your chest and belly', seconds: 16 },
      { label: 'Release your hips and legs', seconds: 16 },
      { label: 'Let your feet grow heavy', seconds: 14 },
      { label: 'Feel the whole body at rest', seconds: 18 },
    ],
  },
  {
    id: 'metta',
    name: 'Loving-Kindness',
    technique: 'Mettā',
    subtitle: 'Warm phrases to soften the heart',
    minutes: 6,
    accent: '#C58BC0',
    kind: 'guided',
    phases: [
      { label: 'Bring someone you care about to mind', seconds: 14 },
      { label: 'May you be safe', seconds: 12 },
      { label: 'May you be healthy', seconds: 12 },
      { label: 'May you be at ease', seconds: 12 },
      { label: 'May you be happy', seconds: 12 },
      { label: 'Now turn this warmth toward yourself', seconds: 14 },
      { label: 'May I be at ease', seconds: 12 },
      { label: 'May all beings be at ease', seconds: 14 },
    ],
  },
  {
    id: 'letgo',
    name: 'Let Go',
    technique: 'Open awareness',
    subtitle: 'Notice thoughts and let them pass',
    minutes: 6,
    accent: '#9385D0',
    kind: 'guided',
    phases: [
      { label: 'Let your awareness rest wide and open', seconds: 16 },
      { label: 'A thought arises…', seconds: 12 },
      { label: '…let it drift away like a cloud', seconds: 14 },
      { label: 'You are the sky — not the clouds', seconds: 16 },
      { label: 'Nothing to hold, nothing to chase', seconds: 16 },
      { label: 'Simply rest here', seconds: 18 },
    ],
  },
];

export function practiceById(id?: string): Practice {
  return PRACTICES.find((p) => p.id === id) ?? PRACTICES[0];
}
