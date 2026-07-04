/**
 * Rule-based AI coach reply engine. Interprets the user's question against
 * their live plan and profile to give grounded, personalized answers.
 * (A production build would swap this for a Claude-powered LLM endpoint.)
 */
import { Plan, UserProfile } from '@/types';

export const MEDICAL_DISCLAIMER =
  'I\'m an AI coach, not a doctor — always consult a healthcare professional for medical decisions.';

export const SUGGESTED_PROMPTS = [
  'What should I eat today?',
  'How many calories do I need?',
  'Give me a quick workout',
  'Am I on track?',
  'How much protein should I eat?',
  'I need some motivation',
];

export function coachReply(
  question: string,
  profile: UserProfile,
  plan: Plan,
): string {
  const q = question.toLowerCase();
  const finish = new Date(plan.prediction.finishDate).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });

  if (/(calorie|kcal|how much.*eat|deficit)/.test(q)) {
    return `Your daily target is ${plan.targets.calories} kcal. That's built from a TDEE of ${plan.metrics.tdee} kcal adjusted for your ${profile.goal} goal at a ${profile.targetSpeed} pace. Stay close to it most days and the weekly average is what matters.`;
  }
  if (/protein/.test(q)) {
    return `Aim for ${plan.targets.proteinG}g of protein daily. Spread it across meals — around ${Math.round(plan.targets.proteinG / 4)}g per meal keeps you full and protects lean muscle while you ${profile.goal} weight.`;
  }
  if (/(carb|fat|macro)/.test(q)) {
    return `Your macro split: ${plan.targets.proteinG}g protein, ${plan.targets.carbsG}g carbs, ${plan.targets.fatG}g fat. Protein is the priority; flex carbs and fat around your training and preferences.`;
  }
  if (/(water|hydrat)/.test(q)) {
    return `Target ${plan.targets.waterMl}ml of water today. A big glass with each meal plus one on waking gets you most of the way there. 💧`;
  }
  if (/(workout|exercise|train|gym)/.test(q)) {
    return `With ${profile.workoutDaysPerWeek} training days planned, aim for ${plan.targets.workoutMinutes} minutes today. Mix strength to preserve muscle with some walking — you're targeting ${plan.targets.walkingMinutes} active minutes too.`;
  }
  if (/(eat|meal|recipe|food|breakfast|lunch|dinner)/.test(q)) {
    return `Head to the Meals tab — I've generated a ${plan.targets.calories} kcal day of ${profile.diet.replace('_', ' ')} meals for you, each with recipes and a grocery list. Tap any meal to regenerate it.`;
  }
  if (/(track|progress|schedule|when|goal|finish)/.test(q)) {
    return `You're projected to reach ${profile.targetWeightKg}kg around ${finish} — about ${plan.prediction.totalWeeks} weeks away at ${plan.prediction.weeklyRateKg}kg/week. Keep logging and I'll adjust as your metabolism adapts.`;
  }
  if (/(weight|bmi|body fat|composition)/.test(q)) {
    return `Current stats: ${profile.weightKg}kg, BMI ${plan.metrics.bmi} (${plan.metrics.bmiCategory}), estimated body fat ${plan.metrics.bodyFatPct}%. Your target is ${profile.targetWeightKg}kg.`;
  }
  if (/(motivat|hard|struggl|give up|tired|stuck)/.test(q)) {
    return MOTIVATION[Math.floor(profile.weightKg) % MOTIVATION.length];
  }
  if (/(medical|doctor|medicine|condition|sick|pain)/.test(q)) {
    return MEDICAL_DISCLAIMER + ' That said, I can help you build habits that support your health.';
  }

  return `Great question! Based on your plan you're targeting ${plan.targets.calories} kcal and ${plan.targets.proteinG}g protein daily, heading for ${profile.targetWeightKg}kg by ${finish}. Ask me about meals, workouts, macros or your progress anytime.`;
}

export type LlmRole = 'system' | 'user' | 'assistant';
export interface LlmMessage {
  role: LlmRole;
  content: string;
}

/**
 * Builds the grounding system prompt for the on-device LLM. It injects the
 * user's real, live plan numbers so the model gives personalised advice rather
 * than generic tips — no fine-tuning required.
 */
export function buildSystemPrompt(profile: UserProfile, plan: Plan): string {
  const finish = new Date(plan.prediction.finishDate).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
  const name = profile.name ? profile.name : 'the user';
  return [
    `You are ${name}'s personal AI fitness and nutrition coach inside a mobile app.`,
    'Be warm, encouraging and practical. Keep replies short — 2 to 4 sentences.',
    "Use the user's real numbers below whenever relevant, and speak directly to them.",
    'You are not a doctor: for medical questions, briefly suggest consulting a healthcare professional.',
    '',
    'USER PROFILE',
    `- Goal: ${profile.goal} weight at a ${profile.targetSpeed} pace`,
    `- Current weight: ${profile.weightKg} kg; target: ${profile.targetWeightKg} kg`,
    `- Diet preference: ${profile.diet.replace(/_/g, ' ')}`,
    `- Training days per week: ${profile.workoutDaysPerWeek}`,
    '',
    'DAILY TARGETS',
    `- Calories: ${plan.targets.calories} kcal (TDEE ${plan.metrics.tdee} kcal)`,
    `- Protein ${plan.targets.proteinG} g, Carbs ${plan.targets.carbsG} g, Fat ${plan.targets.fatG} g`,
    `- Water ${plan.targets.waterMl} ml, Workout ${plan.targets.workoutMinutes} min, Walking ${plan.targets.walkingMinutes} min`,
    `- BMI ${plan.metrics.bmi} (${plan.metrics.bmiCategory}); estimated body fat ${plan.metrics.bodyFatPct}%`,
    '',
    'PROGRESS',
    `- Projected to reach ${profile.targetWeightKg} kg around ${finish} — about ${plan.prediction.totalWeeks} weeks away at ${plan.prediction.weeklyRateKg} kg/week.`,
  ].join('\n');
}

/**
 * Assembles the full chat-message array for the LLM: grounding system prompt,
 * a short slice of recent conversation for continuity, then the new question.
 */
export function buildMessages(
  question: string,
  profile: UserProfile,
  plan: Plan,
  history: { role: 'user' | 'coach'; text: string }[] = [],
): LlmMessage[] {
  const messages: LlmMessage[] = [
    { role: 'system', content: buildSystemPrompt(profile, plan) },
  ];
  for (const h of history.slice(-6)) {
    messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text });
  }
  messages.push({ role: 'user', content: question });
  return messages;
}

const MOTIVATION = [
  "Every day you show up is a vote for the person you're becoming. Keep going. 💪",
  "Progress isn't linear — one tough day doesn't erase your streak. Reset and refocus.",
  "You don't have to be perfect, just consistent. Small wins compound.",
  "Future you is already thanking you for not quitting today. 🌟",
  "Discipline is choosing what you want most over what you want now. You've got this.",
];
