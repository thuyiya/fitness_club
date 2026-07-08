/**
 * Mind-guidance bridge. Turns a user's detected emotional state into a short,
 * concrete recommendation drawn from the Buddhist technique library, and packs
 * it into a compact prompt fragment the on-device LLM can use as extra context.
 *
 * This is what lets the coach "understand the user": deterministic ranking picks
 * genuinely relevant practices, and buildMindGuidancePrompt() hands the model
 * their key steps so it can offer one gently, in its own compassionate words.
 *
 * Everything here is pure and deterministic — no side effects, no Math.random —
 * so the same state always yields the same guidance (and tests can rely on it).
 */
import {
  BUDDHIST_TECHNIQUES,
  MindDifficulty,
  MindTechnique,
} from '@/data/buddhistTechniques';

/**
 * Canonical controlled vocabulary of emotional states, as a const array so it
 * can be iterated/validated, with MoodState derived from it. Mirrors MindState
 * in the data module.
 */
export const MOOD_STATES = [
  'anxiety',
  'sadness',
  'grief',
  'anger',
  'stress',
  'fear',
  'loneliness',
  'craving',
  'restlessness',
  'insomnia',
  'low-energy',
  'overwhelm',
  'self-criticism',
  'numbness',
  'joy',
  'gratitude',
] as const;

export type MoodState = (typeof MOOD_STATES)[number];

/** Difficulty ordering, used to honor a "no harder than" filter. */
const DIFFICULTY_RANK: Record<MindDifficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

export interface RecommendOptions {
  /** Cap on how many techniques to return (default 3). */
  maxResults?: number;
  /** Only include techniques at or under this length. */
  maxDurationMin?: number;
  /** Only include techniques at or below this difficulty. */
  difficulty?: MindDifficulty;
}

/** Narrow an arbitrary string to a MoodState if it is one of the known tags. */
export function isMoodState(value: string): value is MoodState {
  return (MOOD_STATES as readonly string[]).includes(value);
}

/**
 * Ranks techniques by how well they match the given states. Score is the number
 * of overlapping state tags; ties break toward shorter and easier practices,
 * then by id for full determinism. Filters are applied before ranking.
 */
export function recommendTechniques(
  states: MoodState[],
  opts: RecommendOptions = {},
): MindTechnique[] {
  const { maxResults = 3, maxDurationMin, difficulty } = opts;
  const wanted = new Set(states);

  const scored = BUDDHIST_TECHNIQUES
    // Apply the hard filters first.
    .filter((t) => (maxDurationMin == null ? true : t.durationMin <= maxDurationMin))
    .filter((t) =>
      difficulty == null ? true : DIFFICULTY_RANK[t.difficulty] <= DIFFICULTY_RANK[difficulty],
    )
    // Score by state overlap.
    .map((t) => ({
      technique: t,
      score: t.forStates.reduce((n, s) => n + (wanted.has(s) ? 1 : 0), 0),
    }))
    // Drop non-matches only when the caller actually gave us states to match.
    .filter((s) => (wanted.size === 0 ? true : s.score > 0));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.technique.durationMin !== b.technique.durationMin) {
      return a.technique.durationMin - b.technique.durationMin;
    }
    const dr = DIFFICULTY_RANK[a.technique.difficulty] - DIFFICULTY_RANK[b.technique.difficulty];
    if (dr !== 0) return dr;
    return a.technique.id.localeCompare(b.technique.id);
  });

  return scored.slice(0, Math.max(0, maxResults)).map((s) => s.technique);
}

/** Look up a single technique by its stable id. */
export function getTechniqueById(id: string): MindTechnique | undefined {
  return BUDDHIST_TECHNIQUES.find((t) => t.id === id);
}

/** Human-readable list, e.g. ["anxiety","stress"] -> "anxiety and stress". */
function joinStates(states: MoodState[]): string {
  if (states.length === 0) return 'an unsettled or heavy state';
  if (states.length === 1) return states[0];
  return `${states.slice(0, -1).join(', ')} and ${states[states.length - 1]}`;
}

/**
 * Builds a compact system-prompt fragment (a few hundred tokens at most) that
 * names the user's current states and offers 2-3 relevant techniques with their
 * key steps. It instructs the assistant to gently offer ONE, check in first, and
 * stay warm and plain — never preachy. Inject this alongside the coach's main
 * grounding prompt when emotional context is detected.
 */
export function buildMindGuidancePrompt(states: MoodState[]): string {
  const picks = recommendTechniques(states, { maxResults: 3 });
  const lines: string[] = [
    'MIND-HEALING CONTEXT (use with care, do not quote verbatim)',
    `The user seems to be feeling ${joinStates(states)}.`,
    'Below are mindfulness/Buddhist-rooted practices that could help. Offer just ONE, in your own gentle words.',
    '',
    'RELEVANT PRACTICES',
  ];

  if (picks.length === 0) {
    lines.push('- (No specific match — offer a slow breath or the Calm tab.)');
  } else {
    for (const t of picks) {
      // Keep it lean: name, one-line summary, and the first few concrete steps.
      const keySteps = t.steps.slice(0, 3).join(' ');
      lines.push(
        `- ${t.name} (${t.durationMin} min, ${t.difficulty}): ${t.summary} Key steps: ${keySteps}`,
      );
    }
  }

  lines.push(
    '',
    'HOW TO RESPOND',
    '- First acknowledge the feeling warmly, in one short sentence.',
    '- Check in before instructing — ask if they’d like to try something small.',
    '- If they’re open, offer ONE practice above in plain, compassionate language, paraphrasing a step or two.',
    '- Keep it brief (2-4 sentences). No jargon, no lecturing, no spiritual dogma.',
    '- You may mention the Calm tab, but the caring words matter more than any feature.',
  );

  return lines.join('\n');
}
