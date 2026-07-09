/**
 * Turns "how the user feels" (from their chat message + latest mood check-in)
 * into concrete, *playable* Calm suggestions — guided journeys, self-guided
 * practices, or breathing patterns — that Lumora can offer inline in chat.
 *
 * The on-device 1.5B model can't reliably emit structured data, so — like the
 * `parseCoachActions` logging layer — suggestions are computed deterministically
 * here and rendered as tappable/playable cards under Lumora's reply.
 */
import { MoodState } from '@/lib/mindGuidance';
import { GUIDED_SESSIONS } from '@/lib/calmSessions';
import { PRACTICES } from '@/lib/practices';

export type CoachSuggestionKind = 'journey' | 'practice' | 'breathe';

export interface CoachSuggestion {
  kind: CoachSuggestionKind;
  /** journey id · practice id · breathe pattern id */
  id: string;
  title: string;
  subtitle: string;
}

interface Ref {
  kind: CoachSuggestionKind;
  id: string;
}

// Breathing patterns live inline in app/breathe.tsx (not exported), so mirror
// the display copy here for the four pattern ids it understands.
const BREATHE_LABELS: Record<string, { title: string; subtitle: string }> = {
  box: { title: 'Box breathing', subtitle: '4-4-4-4 · steady the nerves' },
  calm478: { title: '4-7-8 breath', subtitle: 'Long exhale · unwind & sleep' },
  release: { title: 'Release breath', subtitle: 'Let tension go on the out-breath' },
  balance: { title: 'Balanced breath', subtitle: 'Even in, even out · re-center' },
};

// Which playable content best serves each emotional state, most-apt first.
// Only ids that are actually playable are used (locked journeys are skipped at
// resolve time).
const STATE_REFS: Partial<Record<MoodState, Ref[]>> = {
  anxiety: [{ kind: 'journey', id: 'breath' }, { kind: 'breathe', id: 'calm478' }],
  fear: [{ kind: 'journey', id: 'breath' }, { kind: 'breathe', id: 'calm478' }],
  stress: [{ kind: 'journey', id: 'bodyscan' }, { kind: 'breathe', id: 'box' }],
  overwhelm: [{ kind: 'journey', id: 'bodyscan' }, { kind: 'breathe', id: 'calm478' }],
  restlessness: [{ kind: 'breathe', id: 'box' }, { kind: 'journey', id: 'breath' }],
  insomnia: [{ kind: 'breathe', id: 'calm478' }, { kind: 'journey', id: 'bodyscan' }],
  'low-energy': [{ kind: 'breathe', id: 'balance' }, { kind: 'practice', id: 'focus' }],
  sadness: [{ kind: 'journey', id: 'metta' }, { kind: 'practice', id: 'metta' }],
  grief: [{ kind: 'journey', id: 'metta' }],
  loneliness: [{ kind: 'journey', id: 'metta' }, { kind: 'practice', id: 'metta' }],
  anger: [{ kind: 'breathe', id: 'release' }, { kind: 'practice', id: 'letgo' }],
  craving: [{ kind: 'practice', id: 'letgo' }, { kind: 'breathe', id: 'release' }],
  'self-criticism': [{ kind: 'journey', id: 'metta' }, { kind: 'practice', id: 'metta' }],
  numbness: [{ kind: 'journey', id: 'metta' }],
  joy: [{ kind: 'practice', id: 'metta' }],
  gratitude: [{ kind: 'practice', id: 'metta' }],
};

// Immediate feelings the user types even without a mood check-in on file.
const KEYWORD_STATES: { re: RegExp; states: MoodState[] }[] = [
  { re: /can'?t sleep|insomnia|lying awake|toss(ing)?|restless night/, states: ['insomnia'] },
  { re: /\bsleep\b|bed ?time|wind[ -]?down|drift off/, states: ['insomnia'] },
  { re: /anxious|anxiety|panic|nervous|worr(y|ied|ying)|on edge|racing thoughts/, states: ['anxiety'] },
  { re: /stress|overwhelm|too much|swamped|under pressure|can'?t cope/, states: ['stress', 'overwhelm'] },
  { re: /\bsad\b|down|blue|depress|unhappy|heavy heart/, states: ['sadness'] },
  { re: /lonely|alone|isolated|no one/, states: ['loneliness'] },
  { re: /grief|grieving|\bloss\b|mourning|passed away/, states: ['grief'] },
  { re: /angry|anger|furious|frustrat|irritat|\brage\b|pissed/, states: ['anger'] },
  { re: /crav(e|ing)|urge to|tempt(ed|ation)/, states: ['craving'] },
  { re: /can'?t focus|concentrat|distract|scattered|brain ?fog|foggy/, states: ['low-energy'] },
  { re: /tired|exhausted|drained|no energy|burn(t| ?)out|wiped/, states: ['low-energy'] },
  { re: /calm down|relax|unwind|de-?stress|breathe|breathing|meditat/, states: ['stress'] },
  { re: /numb|feel empty|disconnected|feel nothing/, states: ['numbness'] },
];

/** Feelings inferred purely from the words the user typed. */
export function statesFromMessage(message: string): MoodState[] {
  const q = message.toLowerCase();
  const set = new Set<MoodState>();
  for (const k of KEYWORD_STATES) if (k.re.test(q)) k.states.forEach((s) => set.add(s));
  return [...set];
}

function resolve(r: Ref): CoachSuggestion | null {
  if (r.kind === 'journey') {
    const s = GUIDED_SESSIONS.find((x) => x.id === r.id);
    if (!s || !s.takes) return null; // skip locked / not-yet-recorded journeys
    return { kind: 'journey', id: s.id, title: s.title, subtitle: s.subtitle };
  }
  if (r.kind === 'practice') {
    const p = PRACTICES.find((x) => x.id === r.id);
    if (!p) return null;
    return { kind: 'practice', id: p.id, title: p.name, subtitle: p.subtitle };
  }
  const b = BREATHE_LABELS[r.id];
  if (!b) return null;
  return { kind: 'breathe', id: r.id, title: b.title, subtitle: b.subtitle };
}

/** Resolve a de-duplicated, capped list of playable suggestions for the given states. */
export function suggestForStates(states: MoodState[], max = 2): CoachSuggestion[] {
  const seen = new Set<string>();
  const out: CoachSuggestion[] = [];
  for (const s of states) {
    for (const r of STATE_REFS[s] ?? []) {
      const key = `${r.kind}:${r.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const resolved = resolve(r);
      if (resolved) out.push(resolved);
      if (out.length >= max) return out;
    }
  }
  return out;
}

/**
 * Main entry: combine what the user just typed with their latest mood check-in
 * (message keywords take priority as the more immediate signal). Returns [] when
 * nothing emotional matches, so cards only appear when they're actually helpful.
 */
export function suggestForChat(message: string, moodStates: MoodState[], max = 2): CoachSuggestion[] {
  const merged = [...statesFromMessage(message), ...moodStates];
  const uniq: MoodState[] = [];
  const seen = new Set<string>();
  for (const s of merged) {
    if (!seen.has(s)) {
      seen.add(s);
      uniq.push(s);
    }
  }
  return suggestForStates(uniq, max);
}
