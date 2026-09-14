import { generateDay } from '../mealGenerator';
import { MEAL_LIBRARY } from '@/data/meals';

describe('offline meal filtering', () => {
  it('does not fall back to excluded recipes when all ingredients are allergens', () => {
    const allergies = [...new Set(MEAL_LIBRARY.flatMap(m => m.ingredients.map(i => i.name)))];
    expect(generateDay({ calories: 2000, diet: 'balanced', allergies })).toEqual([]);
  });
  it('keeps generated meals within the selected diet', () => {
    const meals = generateDay({ calories: 2000, diet: 'vegan', allergies: [] });
    expect(meals.every(m => m.tags.includes('vegan'))).toBe(true);
  });
});
