import { z } from "zod";

/**
 * Contracts shared by the API and the Expo app. Keeping these here means a
 * request body is validated and typed from one definition, on both sides.
 *
 * These intentionally mirror the DB enums; the DB is the source of truth for
 * storage, this is the source of truth for the wire.
 */

export const roleSchema = z.enum(["admin", "coach", "member"]);
export type Role = z.infer<typeof roleSchema>;

export const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export type MealType = z.infer<typeof mealTypeSchema>;

export const recurrenceSchema = z.enum(["once", "daily", "weekly", "biweekly", "monthly"]);
export type Recurrence = z.infer<typeof recurrenceSchema>;

export const healthSourceSchema = z.enum(["apple_health", "google_fit", "manual"]);
export type HealthSource = z.infer<typeof healthSourceSchema>;

/** Macro block reused by foods, meals and logs. */
export const macrosSchema = z.object({
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
});
export type Macros = z.infer<typeof macrosSchema>;

/** ISO date (no time) --- all daily logs key off this. */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;
