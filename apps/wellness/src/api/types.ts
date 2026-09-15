/** Response shapes the screens depend on. Kept narrow --- only what is read. */

export interface DayLog {
  date: string;
  meals: { id: string; mealType: string; calories: string; proteinG: string; carbsG: string; fatG: string; mealName: string | null; photoUrl: string | null }[];
  workouts: { id: string; title: string | null; durationMinutes: number | null; caloriesBurned: number | null; activityName: string | null }[];
  hydration: { totalMl: number; targetMl: number };
  bodyMetrics: { weightKg: string | null } | null;
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number; caloriesBurned: number };
}

export interface Targets {
  ready: boolean;
  missing?: string[];
  basis?: { tdeeKcal: number; weightKg: number; sportProfile: { label: string } | null; goalType: string };
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number; hydrationMl: number; basis: string } | null;
}

export interface Series {
  hydration: { date: string; ml: number }[];
  activity: { date: string; minutes: number; kcal: number }[];
  weight: { date: string; weightKg: string }[];
}

export interface Goal {
  id: string;
  title: string;
  metric: string;
  targetValue: string;
  unit: string | null;
  source: "coach" | "personal";
  entries: { date: string; value: string; achieved: boolean }[];
  achievedCount: number;
  evaluatedCount: number;
}

export interface CoachToday {
  date: string;
  members: {
    id: string; name: string; avatarUrl: string | null;
    done: boolean; sessionTitle: string | null; minutes: number;
    kcalIn: number; proteinG: number; mealsLogged: number; hydrationMl: number;
  }[];
  completed: string[];
  attention: string[];
}

export interface Revenue {
  series: { month: string; amount: number; payments: number }[];
  current: number;
  changePct: number | null;
  activeMembers: number;
}

export interface Thread {
  id: string;
  lastMessageAt: string | null;
  participants: { id: string; name: string; role: string; avatarUrl: string | null }[];
  lastMessage: { body: string; createdAt: string } | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}

export interface MealRec {
  id: string; slug: string; name: string; mealType: string | null; tags: string[];
  servings: string; proteinG: string; carbsG: string; fatG: string; prepMinutes: number | null;
  allergens: string[];
}

export interface AdminOverview {
  platform: { gyms: number; coaches: number; members: number; activeSubs: number; mrr: number; pendingRequests: number; logsToday: number };
  catalog: { foods: number; meals: number; exercises: number; activities: number; embedded: number; vectorReady: boolean };
}
