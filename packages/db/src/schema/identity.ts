import { boolean, index, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { devicePlatform, userRole, userStatus } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    role: userRole("role").notNull().default("member"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    /** argon2id. Never bcrypt --- we own auth precisely so there is no per-MAU bill. */
    passwordHash: text("password_hash").notNull(),
    status: userStatus("status").notNull().default("active"),
    /** Logs are stored UTC; this renders "today" correctly for the member. */
    timezone: text("timezone").notNull().default("UTC"),
    heightCm: numeric("height_cm", { precision: 5, scale: 1 }),
    dateOfBirth: timestamp("date_of_birth", { withTimezone: false, mode: "date" }),
    /** Free-text injuries/limitations from onboarding, shown on M20 and C07. */
    bio: text("bio"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    index("users_role_idx").on(t.role),
  ],
);

/**
 * Refresh tokens are stored hashed so a database leak cannot mint sessions.
 * Rotation: issue a new row, revoke the old one, on every refresh.
 */
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("refresh_tokens_hash_unique").on(t.tokenHash),
    index("refresh_tokens_user_idx").on(t.userId),
  ],
);

/** Expo push tokens. Free tier, no vendor bill. */
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expoPushToken: text("expo_push_token").notNull(),
    platform: devicePlatform("platform").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("push_tokens_token_unique").on(t.expoPushToken),
    index("push_tokens_user_idx").on(t.userId),
  ],
);
