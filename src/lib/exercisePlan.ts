import { UserProfile, Plan } from "@/types";
export type MovementId =
  "squat" | "pushup" | "bridge" | "lunge" | "deadbug" | "plank";
export interface Movement {
  id: MovementId;
  name: string;
  cues: string[];
  easier: string;
}
export const MOVEMENTS: Movement[] = [
  {
    id: "squat",
    name: "Bodyweight squat",
    cues: [
      "Stand with feet about shoulder-width apart.",
      "Sit your hips back and bend your knees comfortably.",
      "Push through your feet to stand tall.",
    ],
    easier: "Use a chair as a depth guide and support.",
  },
  {
    id: "pushup",
    name: "Wall / incline push-up",
    cues: [
      "Place hands on a wall or a stable, fixed surface.",
      "Keep your body straight as you bend your elbows.",
      "Press away, keeping your shoulders relaxed.",
    ],
    easier: "Stand more upright against a wall.",
  },
  {
    id: "bridge",
    name: "Glute bridge",
    cues: [
      "Lie on your back with knees bent and feet flat.",
      "Lift your hips until shoulders, hips and knees align.",
      "Lower slowly without arching your back.",
    ],
    easier: "Lift through a smaller comfortable range.",
  },
  {
    id: "lunge",
    name: "Reverse lunge",
    cues: [
      "Stand tall and step one foot back.",
      "Bend both knees through a comfortable range.",
      "Press through the front foot to stand; switch sides.",
    ],
    easier: "Hold a stable support and take a smaller step.",
  },
  {
    id: "deadbug",
    name: "Dead bug",
    cues: [
      "Lie on your back with arms up and knees bent.",
      "Lower opposite arm and leg slowly without arching.",
      "Return to the start and alternate sides.",
    ],
    easier: "Move only your legs, tapping one heel at a time.",
  },
  {
    id: "plank",
    name: "Forearm plank",
    cues: [
      "Place elbows below shoulders, forearms on the floor.",
      "Keep your body in a straight line and breathe.",
      "Stop the hold when you cannot keep your form.",
    ],
    easier: "Keep knees on the floor for a shorter hold.",
  },
];
export interface ExercisePreferences {
  minutes: 15 | 25 | 40;
  level: "gentle" | "steady";
  variation: number;
}
export interface DayExercise {
  name: string;
  strength: boolean;
  minutes: number;
  walkMinutes: number;
  activeKcal: number;
  sets: number;
  reps: number;
  holdSeconds: number;
  movements: Movement[];
}
const TRAINING_DAYS: Record<number, number[]> = {
  0: [],
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 6],
  5: [1, 2, 3, 5, 6],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};
/** Net active energy (above rest), an estimate rather than a wearable reading. */
export function activeEnergy(minutes: number, kg: number, met: number): number {
  return Math.round(((Math.max(0, met - 1) * 3.5 * kg) / 200) * minutes);
}
export function buildExerciseDay(
  profile: UserProfile,
  prefs: ExercisePreferences,
  date = new Date(),
): DayExercise {
  const days =
    TRAINING_DAYS[
      Math.max(0, Math.min(7, Math.round(profile.workoutDaysPerWeek)))
    ];
  const selected = days.includes(date.getDay());
  // At most three full-body sessions, separated by a day of recovery.
  const strengthDays: Record<number, number[]> = {
    0: [],
    1: [1],
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 4, 6],
    5: [1, 3, 5],
    6: [1, 3, 5],
    7: [1, 3, 5],
  };
  const strength = strengthDays[days.length].includes(date.getDay());
  const minutes = strength ? prefs.minutes : selected ? 15 : 0;
  const walkMinutes =
    profile.activityLevel === "sedentary" || prefs.level === "gentle" ? 15 : 25;
  const count = prefs.minutes === 15 ? 4 : 6;
  const rotated = [
    ...MOVEMENTS.slice(prefs.variation % 6),
    ...MOVEMENTS.slice(0, prefs.variation % 6),
  ];
  return {
    name: strength
      ? "Full-body foundations"
      : selected
        ? "Mobility & easy movement"
        : "Recovery day",
    strength,
    minutes,
    walkMinutes,
    activeKcal:
      activeEnergy(walkMinutes, profile.weightKg, 3.5) +
      activeEnergy(minutes, profile.weightKg, strength ? 3.5 : 2.3),
    sets: prefs.minutes === 40 ? 3 : 2,
    reps: prefs.level === "gentle" ? 8 : 12,
    holdSeconds: prefs.level === "gentle" ? 15 : 25,
    movements: strength ? rotated.slice(0, count) : [],
  };
}
export function goalEnergy(plan: Plan) {
  const balance = Math.round(plan.metrics.tdee - plan.targets.calories);
  return {
    totalBurn: plan.metrics.tdee,
    foodTarget: plan.targets.calories,
    balance,
    label:
      balance > 0
        ? "Planned deficit"
        : balance < 0
          ? "Planned surplus"
          : "Maintenance balance",
  };
}
