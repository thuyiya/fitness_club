/**
 * Natural-language intent parser for the Coach. The on-device 1.5B model can't
 * be trusted to do calorie/time math reliably, so logging and profile edits are
 * extracted deterministically here, applied to the stores, and confirmed by the
 * coach. The model still handles open-ended conversation.
 */

export type CoachAction =
  | { type: 'meal'; calories: number; proteinG: number; label: string }
  | { type: 'walk'; minutes: number; distanceKm: number }
  | { type: 'workout'; minutes: number; label: string }
  | { type: 'water'; ml: number }
  | { type: 'targetWeight'; kg: number };

export interface ParsedCoach {
  /** Data changes to apply to the stores. */
  actions: CoachAction[];
  /** Request to save the coach's last suggested plan to Workouts or Meals. */
  savePlan?: 'workout' | 'meal';
}

const MILES_TO_KM = 1.60934;
const LB_TO_KG = 1 / 2.2046;

/** First number that matches a pattern with a capture group, or undefined. */
function num(text: string, re: RegExp): number | undefined {
  const m = text.match(re);
  return m ? parseFloat(m[1]) : undefined;
}

/** Minutes from any "2 hours", "90 min", "1.5 hr" mention. */
function parseMinutes(text: string): number | undefined {
  const hrs = num(text, /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  const mins = num(text, /(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b/);
  let total = 0;
  if (hrs) total += hrs * 60;
  if (mins) total += mins;
  return total > 0 ? Math.round(total) : undefined;
}

/** Distance in km from "10 miles", "5 km", "5k". */
function parseDistanceKm(text: string): number | undefined {
  const miles = num(text, /(\d+(?:\.\d+)?)\s*(?:miles?|mi)\b/);
  if (miles) return +(miles * MILES_TO_KM).toFixed(1);
  const km = num(text, /(\d+(?:\.\d+)?)\s*(?:kilometers?|kms?|k)\b/);
  if (km) return +km.toFixed(1);
  return undefined;
}

export function parseCoachActions(raw: string): ParsedCoach {
  const text = ` ${raw.toLowerCase()} `;
  const actions: CoachAction[] = [];

  // Questions and hypotheticals should never mutate data ("how many calories
  // should I eat?", "should I do yoga?"). Only statements log.
  const isQuestion =
    raw.includes('?') ||
    /\b(should i|how many|how much|what should|do i need|is it|recommend|suggest|what's|whats)\b/.test(
      text,
    ) ||
    /^\s*(how|what|when|why|which|should|could|would|do|does|is|are)\b/.test(raw.toLowerCase());

  // --- Save the coach's suggested plan ----------------------------------
  // Detected first so "add this to my workout plan" doesn't also log a workout.
  if (/\b(add|save|put)\b/.test(text) && /\bplan\b|routine|schedule/.test(text)) {
    if (/workout|exercise|training|fitness|gym/.test(text)) return { actions: [], savePlan: 'workout' };
    if (/meal|food|diet|nutrition|eating/.test(text)) return { actions: [], savePlan: 'meal' };
  }

  // --- Target weight change ---------------------------------------------
  // Only when clearly about a goal/target weight, to avoid catching other numbers.
  const targetCtx =
    /(target|goal)\s*weight|change\s+my\s+(?:target|goal)|(?:want to|wanna|like to)\s+(?:be|reach|hit|get to|weigh)|new target/.test(
      text,
    );
  if (targetCtx) {
    const lb = num(text, /(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)\b/);
    const kg = num(text, /(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?)\b/);
    const bare = num(text, /(?:to|be|weigh|reach|hit)\s+(\d+(?:\.\d+)?)\b/);
    const value = kg ?? (lb ? +(lb * LB_TO_KG).toFixed(1) : bare);
    if (value && value >= 30 && value <= 250) {
      actions.push({ type: 'targetWeight', kg: Math.round(value) });
    }
  }

  // --- Water ------------------------------------------------------------
  if (!isQuestion && /\bwater\b|\bhydrat/.test(text)) {
    const litres = num(text, /(\d+(?:\.\d+)?)\s*(?:litres?|liters?|l)\b/);
    const mls = num(text, /(\d+(?:\.\d+)?)\s*ml\b/);
    const glasses = num(text, /(\d+(?:\.\d+)?)\s*(?:glass|glasses|cups?)\b/);
    const ml = mls ?? (litres ? litres * 1000 : glasses ? glasses * 250 : undefined);
    if (ml && ml > 0) actions.push({ type: 'water', ml: Math.round(ml) });
  }

  // --- Exercise ---------------------------------------------------------
  const doneVerb = /\b(did|done|finished|completed|went|had|got|just|after|smashed|logged)\b/.test(text);
  const isWalk = /\bwalk|walked|walking|stroll|hike|hiked/.test(text);
  const isRun = /\bran\b|\brun\b|running|jog|jogged|jogging/.test(text);
  const isWorkout =
    /\bgym\b|workout|worked out|lift|lifting|weights|yoga|pilates|cycle|cycling|biking|swim|swam|swimming|cardio|hiit|exercis|training|trained/.test(
      text,
    );
  if (!isQuestion && (isWalk || isRun)) {
    const distanceKm = parseDistanceKm(text) ?? 0;
    let minutes = parseMinutes(text);
    if (!minutes && distanceKm) minutes = Math.round(distanceKm * (isRun ? 6 : 12));
    if (minutes || distanceKm) {
      actions.push({ type: 'walk', minutes: minutes ?? 0, distanceKm });
    }
  } else if (!isQuestion && isWorkout) {
    const minutes = parseMinutes(text);
    // Only log if they actually did it (a duration, or a past-tense cue).
    if (minutes || doneVerb) {
      const label =
        (text.match(/\b(gym|yoga|pilates|cycling|swim(?:ming)?|cardio|hiit|weights|lifting)\b/) ?? [])[1] ??
        'workout';
      actions.push({ type: 'workout', minutes: minutes ?? 30, label });
    }
  }

  // --- Meal -------------------------------------------------------------
  const ateVerb = /\bate\b|\beaten\b|\bhad\b|\bgrabbed\b|\bsnacked\b|\beating\b/.test(text);
  const mealNoun = /\bbreakfast\b|\blunch\b|\bdinner\b|\bsnack\b|\bmeal\b/.test(text);
  const foodMention = FOODS.some((f) => text.includes(f));
  const mealCtx = !isQuestion && (ateVerb || mealNoun || (foodMention && /\d/.test(text)));
  if (mealCtx) {
    const kcal = num(text, /(\d+(?:\.\d+)?)\s*(?:kcal|calories?|cals?)\b/);
    const proteinExplicit = num(text, /(\d+(?:\.\d+)?)\s*g(?:rams?)?\s*(?:of\s*)?protein/) ??
      num(text, /protein[^\d]{0,12}(\d+(?:\.\d+)?)\s*g/);
    // A bare "200g" near food is a portion weight, not protein.
    const portionG = proteinExplicit ? undefined : num(text, /(\d+(?:\.\d+)?)\s*g(?:rams?)?\b/);

    let calories = kcal ?? 0;
    let proteinG = proteinExplicit ?? 0;
    if (!calories) {
      if (proteinExplicit) calories = Math.min(Math.round(proteinExplicit * 8), 1200);
      else if (portionG) calories = Math.round(portionG * 1.3);
      else calories = 400; // generic logged meal
    }
    if (!proteinG) {
      if (portionG) proteinG = Math.round(portionG * 0.12);
      else proteinG = Math.round(calories * 0.075); // ~30% cals from protein / 4
    }
    const label = mealLabel(text);
    actions.push({ type: 'meal', calories, proteinG, label });
  }

  return { actions };
}

/** A short, natural confirmation for what was just logged. */
export function summarizeActions(actions: CoachAction[]): string {
  if (actions.length === 0) return '';
  const parts = actions.map(phrase);
  const joined =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  const cap = joined.charAt(0).toUpperCase() + joined.slice(1);
  const kudos = ['Nice work! 🙌', 'Keep it up 💪', "That's in your day now.", 'Logged and saved. ✅'];
  let h = 0;
  for (const a of actions) h += a.type.length;
  return `${cap}. ${kudos[h % kudos.length]}`;
}

function phrase(a: CoachAction): string {
  switch (a.type) {
    case 'meal':
      return `logged ${a.label} (~${a.calories} kcal, ${a.proteinG}g protein)`;
    case 'walk':
      return a.distanceKm
        ? `logged a ${a.minutes}-min walk covering ${a.distanceKm} km`
        : `logged a ${a.minutes}-min walk`;
    case 'workout':
      return `logged ${a.minutes} min of ${a.label}`;
    case 'water':
      return `logged ${a.ml} ml of water`;
    case 'targetWeight':
      return `set your target weight to ${a.kg} kg and refreshed your plan`;
  }
}

const FOODS = [
  'rice', 'chicken', 'egg', 'eggs', 'salad', 'oats', 'oatmeal', 'banana', 'apple',
  'beef', 'fish', 'salmon', 'tuna', 'pasta', 'bread', 'yogurt', 'protein shake',
  'shake', 'smoothie', 'potato', 'sandwich', 'burger', 'pizza', 'soup', 'curry',
  'tofu', 'beans', 'nuts', 'cheese', 'milk', 'coffee', 'veg', 'vegetables',
];

/** A friendly meal label from any recognised foods, else "meal". */
function mealLabel(text: string): string {
  const found = FOODS.filter((f) => text.includes(f));
  if (found.length === 0) return 'meal';
  if (found.length === 1) return found[0];
  return `${found[0]} + ${found[1]}`;
}
