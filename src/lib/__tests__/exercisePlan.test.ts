import { activeEnergy, buildExerciseDay, goalEnergy } from "../exercisePlan";
import { UserProfile, Plan } from "@/types";
const profile = {
  workoutDaysPerWeek: 3,
  weightKg: 80,
  activityLevel: "moderate",
} as UserProfile;
const prefs = { minutes: 25, level: "gentle", variation: 0 } as const;
describe("offline exercise schedule", () => {
  it("never puts full-body strength on adjacent days, including the week boundary", () => {
    for (let count = 0; count <= 7; count++) {
      const days = Array.from({ length: 8 }, (_, i) =>
        buildExerciseDay(
          { ...profile, workoutDaysPerWeek: count },
          prefs,
          new Date(2026, 8, 7 + i),
        ),
      );
      days
        .slice(0, 7)
        .forEach((d, i) =>
          expect(d.strength && days[i + 1].strength).toBe(false),
        );
    }
  });
  it("keeps a zero-day preference as recovery, with no strength session", () => {
    const day = buildExerciseDay(
      { ...profile, workoutDaysPerWeek: 0 },
      prefs,
      new Date(2026, 8, 7),
    );
    expect(day.minutes).toBe(0);
    expect(day.movements).toEqual([]);
  });
  it("uses a repeatable routine and a shorter list for 15-minute sessions", () => {
    const date = new Date(2026, 8, 7);
    expect(buildExerciseDay(profile, prefs, date)).toEqual(
      buildExerciseDay(profile, prefs, date),
    );
    expect(
      buildExerciseDay(profile, { ...prefs, minutes: 15 }, date).movements,
    ).toHaveLength(4);
  });
  it("estimates active calories above rest only", () => {
    expect(activeEnergy(30, 80, 1)).toBe(0);
    expect(activeEnergy(30, 80, 3.5)).toBe(105);
  });
  it("keeps the deficit separate from activity energy and supports surplus goals", () => {
    const plan = {
      metrics: { tdee: 2400 },
      targets: { calories: 2000 },
    } as Plan;
    expect(goalEnergy(plan).balance).toBe(400);
    expect(
      goalEnergy({ ...plan, targets: { ...plan.targets, calories: 2700 } })
        .label,
    ).toBe("Planned surplus");
  });
});
