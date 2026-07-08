import {
  buildMindGuidancePrompt,
  getTechniqueById,
  isMoodState,
  MOOD_STATES,
  recommendTechniques,
} from '../mindGuidance';
import { BUDDHIST_TECHNIQUES } from '@/data/buddhistTechniques';

describe('recommendTechniques', () => {
  it('ranks techniques that overlap the given states first', () => {
    const results = recommendTechniques(['anxiety', 'stress']);
    expect(results.length).toBeGreaterThan(0);
    // Every result must actually help with at least one requested state.
    for (const t of results) {
      expect(t.forStates.some((s) => s === 'anxiety' || s === 'stress')).toBe(true);
    }
  });

  it('is deterministic for the same input', () => {
    const a = recommendTechniques(['grief', 'sadness']);
    const b = recommendTechniques(['grief', 'sadness']);
    expect(a.map((t) => t.id)).toEqual(b.map((t) => t.id));
  });

  it('respects maxResults, maxDurationMin and difficulty filters', () => {
    const results = recommendTechniques(['anxiety', 'stress', 'overwhelm'], {
      maxResults: 2,
      maxDurationMin: 8,
      difficulty: 'beginner',
    });
    expect(results.length).toBeLessThanOrEqual(2);
    for (const t of results) {
      expect(t.durationMin).toBeLessThanOrEqual(8);
      expect(t.difficulty).toBe('beginner');
    }
  });

  it('drops non-matching techniques when states are provided', () => {
    const results = recommendTechniques(['craving']);
    for (const t of results) {
      expect(t.forStates).toContain('craving');
    }
  });
});

describe('getTechniqueById', () => {
  it('finds a known technique and returns undefined otherwise', () => {
    expect(getTechniqueById('metta')?.name).toContain('Loving-Kindness');
    expect(getTechniqueById('does-not-exist')).toBeUndefined();
  });
});

describe('isMoodState', () => {
  it('validates against the controlled vocabulary', () => {
    expect(isMoodState('anxiety')).toBe(true);
    expect(isMoodState('hangry')).toBe(false);
  });
});

describe('buildMindGuidancePrompt', () => {
  it('names the states and includes recommended practices', () => {
    const prompt = buildMindGuidancePrompt(['anxiety', 'overwhelm']);
    expect(prompt).toContain('anxiety');
    expect(prompt).toContain('overwhelm');
    expect(prompt).toContain('RELEVANT PRACTICES');
    expect(prompt).toContain('HOW TO RESPOND');
    // Must reference at least one real technique name.
    const mentionsOne = BUDDHIST_TECHNIQUES.some((t) => prompt.includes(t.name));
    expect(mentionsOne).toBe(true);
  });

  it('stays reasonably compact', () => {
    const prompt = buildMindGuidancePrompt(['sadness', 'grief', 'loneliness']);
    // A few hundred tokens ~= well under 2000 characters.
    expect(prompt.length).toBeLessThan(2000);
  });
});

describe('data integrity', () => {
  it('every technique forState is in the controlled vocabulary', () => {
    const vocab = new Set<string>(MOOD_STATES);
    for (const t of BUDDHIST_TECHNIQUES) {
      for (const s of t.forStates) {
        expect(vocab.has(s)).toBe(true);
      }
    }
  });

  it('technique ids are unique and kebab-case', () => {
    const ids = BUDDHIST_TECHNIQUES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});
