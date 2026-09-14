import { pgEnum } from "drizzle-orm/pg-core";

/** Admin sees everything, coach owns gyms/plans, member consumes them. */
export const userRole = pgEnum("user_role", ["admin", "coach", "member"]);
export const userStatus = pgEnum("user_status", ["pending", "active", "suspended"]);

export const membershipStatus = pgEnum("membership_status", ["pending", "active", "inactive"]);
export const requestStatus = pgEnum("request_status", ["pending", "approved", "rejected"]);

export const planType = pgEnum("plan_type", ["workout", "meal"]);
export const planStatus = pgEnum("plan_status", ["draft", "published", "archived"]);
export const assignmentStatus = pgEnum("assignment_status", ["scheduled", "active", "completed", "cancelled"]);
/** Drives C32 "repeats weekly / biweekly / once". */
export const recurrence = pgEnum("recurrence", ["once", "daily", "weekly", "biweekly", "monthly"]);

export const mealType = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);
/** Where a food row came from. Open Food Facts is the free bulk source. */
export const foodSource = pgEnum("food_source", ["open_food_facts", "custom", "verified"]);

export const goalSource = pgEnum("goal_source", ["coach", "personal"]);
export const goalPeriod = pgEnum("goal_period", ["daily", "weekly", "monthly"]);
export const goalStatus = pgEnum("goal_status", ["active", "achieved", "missed", "archived"]);

export const threadKind = pgEnum("thread_kind", ["direct", "team"]);
export const messageKind = pgEnum("message_kind", ["text", "image", "system"]);

export const surveyStatus = pgEnum("survey_status", ["draft", "active", "closed"]);
export const questionType = pgEnum("question_type", [
  "single_choice",
  "multi_choice",
  "scale",
  "short_text",
  "long_text",
  "date",
  "boolean",
]);

export const notificationKind = pgEnum("notification_kind", [
  "announcement",
  "message",
  "plan_assigned",
  "session_reminder",
  "hydration_reminder",
  "survey_assigned",
  "join_request",
  "system",
]);
export const devicePlatform = pgEnum("device_platform", ["ios", "android", "web"]);

export const subscriptionAudience = pgEnum("subscription_audience", ["coach", "member"]);
export const subscriptionInterval = pgEnum("subscription_interval", ["month", "year"]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "cancelled",
  "expired",
]);
export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "refunded", "failed"]);

/** HealthKit and Google Fit write the same shape; keep the origin so we can de-dupe. */
export const healthSource = pgEnum("health_source", ["apple_health", "google_fit", "manual"]);
