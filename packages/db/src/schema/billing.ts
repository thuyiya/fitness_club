import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  devicePlatform,
  paymentStatus,
  subscriptionAudience,
  subscriptionInterval,
  subscriptionStatus,
} from "./enums.js";
import { users } from "./identity.js";

/**
 * Billing runs through App Store / Play in-app purchase, so this schema is a
 * *mirror* of store state rather than the source of truth. Store webhooks and
 * receipt validation write here; we never charge a card ourselves.
 *
 * Money is integer cents. Never floats.
 */
export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    audience: subscriptionAudience("audience").notNull(),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    interval: subscriptionInterval("interval").notNull(),
    /** Store-side identifiers so a receipt can be matched back to a plan. */
    appleProductId: text("apple_product_id"),
    googleProductId: text("google_product_id"),
    features: jsonb("features"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscription_plans_audience_idx").on(t.audience, t.active)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    status: subscriptionStatus("status").notNull().default("trialing"),
    platform: devicePlatform("platform").notNull(),
    /** Store's canonical subscription id --- the de-dupe key for webhooks. */
    storeTransactionId: text("store_transaction_id"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("subscriptions_store_txn_unique").on(t.storeTransactionId),
    index("subscriptions_user_status_idx").on(t.userId, t.status),
  ],
);

/**
 * One row per successful charge. C38's revenue chart is:
 *   SELECT date_trunc('month', paid_at), SUM(amount_cents) ... GROUP BY 1
 * which is exactly why this is Postgres and not a document store.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The coach whose revenue this counts toward (C38). */
    coachId: uuid("coach_id").references(() => users.id, { onDelete: "set null" }),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    status: paymentStatus("status").notNull().default("paid"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    storeReceipt: text("store_receipt"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("payments_coach_paid_idx").on(t.coachId, t.paidAt),
    index("payments_user_idx").on(t.userId),
  ],
);
