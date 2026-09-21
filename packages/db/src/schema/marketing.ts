/**
 * What a coach shows to members who have not joined them yet.
 *
 * Separate from `announcements`, which go to people already inside a gym. A
 * promotion is public-facing and is the thing that persuades someone to make
 * contact, so it carries its own validity window and has to survive the coach
 * having no relationship with the reader at all.
 */
import { boolean, date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { promotionKind } from "./enums.js";
import { users } from "./identity.js";

export const coachPromotions = pgTable(
  "coach_promotions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: promotionKind("kind").notNull().default("announcement"),
    title: text("title").notNull(),
    body: text("body"),
    /** Shown as-is, e.g. "20% off the first month". Not used for billing. */
    offerText: text("offer_text"),
    imageUrl: text("image_url"),
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("coach_promotions_coach_idx").on(t.coachId, t.isActive)],
);

/**
 * A coach's public-facing profile.
 *
 * Kept out of `users` because these are marketing fields that only coaches
 * have, and widening the users table with eight nullable columns that are
 * meaningless for members and admins makes every query read worse.
 */
export const coachProfiles = pgTable(
  "coach_profiles",
  {
    coachId: uuid("coach_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    headline: text("headline"),
    specialties: text("specialties").array().notNull().default([]),
    certifications: text("certifications").array().notNull().default([]),
    yearsExperience: integer("years_experience"),
    languages: text("languages").array().notNull().default([]),
    /** Shown as a range rather than a live price; billing is elsewhere. */
    priceFrom: integer("price_from_cents"),
    currency: text("currency").notNull().default("GBP"),
    acceptingClients: boolean("accepting_clients").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);
