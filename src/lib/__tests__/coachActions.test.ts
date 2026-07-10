import { parseCoachActions } from '../coachActions';

describe('parseCoachActions', () => {
  it('logs a meal with explicit protein', () => {
    const { actions } = parseCoachActions('I ate rice with chicken, 200g protein');
    const meal = actions.find((a) => a.type === 'meal');
    expect(meal).toBeDefined();
    if (meal?.type === 'meal') {
      expect(meal.proteinG).toBe(200);
      expect(meal.calories).toBeGreaterThan(0);
      expect(meal.label).toContain('rice');
    }
  });

  it('logs a walk from hours and miles', () => {
    const { actions } = parseCoachActions('did 2 hour walking around 10 miles');
    const walk = actions.find((a) => a.type === 'walk');
    expect(walk).toBeDefined();
    if (walk?.type === 'walk') {
      expect(walk.minutes).toBe(120);
      expect(walk.distanceKm).toBeCloseTo(16.1, 0);
    }
  });

  it('logs the combined meal + walk from one sentence', () => {
    const { actions } = parseCoachActions(
      'I eate rice with chiken around 200g and did 2 hour walking around 10 miles',
    );
    expect(actions.some((a) => a.type === 'meal')).toBe(true);
    expect(actions.some((a) => a.type === 'walk')).toBe(true);
  });

  it('logs water in glasses', () => {
    const { actions } = parseCoachActions('I drank 3 glasses of water');
    expect(actions).toContainEqual({ type: 'water', ml: 750 });
  });

  it('changes the target weight in kg', () => {
    const { actions } = parseCoachActions('change my target to 75 kg');
    expect(actions).toContainEqual({ type: 'targetWeight', kg: 75 });
  });

  it('converts a target given in pounds', () => {
    const { actions } = parseCoachActions('I want to reach 154 lbs');
    const t = actions.find((a) => a.type === 'targetWeight');
    expect(t?.type === 'targetWeight' && t.kg).toBe(70);
  });

  it('logs a workout with a sensible default duration', () => {
    const { actions } = parseCoachActions('did some yoga today');
    const w = actions.find((a) => a.type === 'workout');
    expect(w?.type === 'workout' && w.minutes).toBe(30);
    expect(w?.type === 'workout' && w.label).toBe('yoga');
  });

  it('does not treat a normal question as an action', () => {
    const parsed = parseCoachActions('how many calories should I eat?');
    expect(parsed.actions).toHaveLength(0);
  });

  it('does not log anything for venting without data', () => {
    const parsed = parseCoachActions("I'm so stressed and anxious right now");
    expect(parsed.actions).toHaveLength(0);
    expect(parsed.savePlan).toBeUndefined();
  });

  it('recognises a request to save a workout plan', () => {
    const parsed = parseCoachActions('add this to my workout plan');
    expect(parsed.savePlan).toBe('workout');
    expect(parsed.actions).toHaveLength(0);
  });

  it('recognises a request to save a meal plan without logging a meal', () => {
    const parsed = parseCoachActions('save this to my meal plan');
    expect(parsed.savePlan).toBe('meal');
    expect(parsed.actions).toHaveLength(0);
  });
});
