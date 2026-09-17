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
export const foodSource = pgEnum("food_source", ["open_food_facts", "custom", "verified", "usda"]);

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

/**
 * Exercise taxonomy. These four axes are deliberately independent --- a coach
 * filters on several at once ("calisthenics pull work for someone with a bar").
 * See packages/db/seed/README.md for why sports are NOT a discipline here.
 */
export const discipline = pgEnum("discipline", ["calisthenics", "gym", "cardio", "mobility"]);
export const exerciseCategory = pgEnum("exercise_category", [
  "strength",
  "cardio",
  "hiit",
  "mobility",
  "flexibility",
  "plyometric",
  "balance",
  "core",
  "warmup",
  "cooldown",
]);
export const movementPattern = pgEnum("movement_pattern", [
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "squat",
  "hinge",
  "lunge",
  "carry",
  "rotation",
  "isolation",
  "locomotion",
]);
/**
 * Decides which columns a set row fills. Without this an app asks for "reps"
 * on a plank and cannot record a farmer's walk or a front lever at all.
 */
export const loggingMode = pgEnum("logging_mode", ["reps", "hold", "distance", "duration", "rounds"]);
/** Four levels, not three: calisthenics statics sit far beyond "advanced". */
export const difficultyLevel = pgEnum("difficulty_level", ["beginner", "intermediate", "advanced", "elite"]);

/** Why an activity row exists, which decides where it may appear in the UI. */
export const activityKind = pgEnum("activity_kind", ["sport", "training_session", "daily_living"]);
export const activityIntensity = pgEnum("activity_intensity", ["light", "moderate", "vigorous"]);
/** Carbohydrate-led versus protein-led macro prescription. */
export const sportType = pgEnum("sport_type", ["endurance", "power"]);

/** Required by Mifflin-St Jeor; there is no way to compute BMR without it. */
export const biologicalSex = pgEnum("biological_sex", ["male", "female"]);
export const activityLevel = pgEnum("activity_level", [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extra_active",
]);
export const goalType = pgEnum("goal_type", [
  "fat_loss",
  "maintain",
  "muscle_gain",
  "recomposition",
  "endurance",
  "general_health",
]);

/** Scheduled one-to-one time between a coach and a member. */
export const appointmentKind = pgEnum("appointment_kind", [
  "training_session",
  "consultation",
  "assessment",
  "check_in",
]);
export const appointmentStatus = pgEnum("appointment_status", [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

/**
 * A gym's lifecycle. Deliberately not the user_status enum it used to borrow:
 * a gym is not "suspended", it is awaiting approval, live, turned down, or
 * retired --- and a coach-created gym must not be live before an admin sees it.
 */
export const gymStatus = pgEnum("gym_status", ["pending", "active", "rejected", "archived"]);

/** Why a gym was reported, and where the report has got to. */
export const reportReason = pgEnum("report_reason", [
  "misleading_info",
  "unsafe_practice",
  "unprofessional_conduct",
  "billing_dispute",
  "closed_or_moved",
  "other",
]);
export const reportStatus = pgEnum("report_status", ["open", "reviewing", "resolved", "dismissed"]);
