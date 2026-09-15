import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { messageKind, notificationKind, threadKind } from "./enums.js";
import { gyms, teams } from "./gyms.js";
import { users } from "./identity.js";

/**
 * Chat lives in Postgres, not a separate realtime database. Delivery is a
 * websocket fan-out over Redis pub/sub; this table is the durable record.
 * Product rule: members may only ever be in a thread with their coach or their
 * team --- enforced when creating the thread, not by table shape.
 */
export const threads = pgTable(
  "threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: threadKind("kind").notNull(),
    gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("threads_team_idx").on(t.teamId),
    index("threads_last_message_idx").on(t.lastMessageAt),
  ],
);

export const threadParticipants = pgTable(
  "thread_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Drives the unread badge on C17 without scanning messages. */
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("thread_participants_unique").on(t.threadId, t.userId),
    index("thread_participants_user_idx").on(t.userId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }),
    kind: messageKind("kind").notNull().default("text"),
    body: text("body"),
    attachmentUrl: text("attachment_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  // Descending so "latest page of a thread" is an index-only scan.
  (t) => [index("messages_thread_created_idx").on(t.threadId, t.createdAt)],
);

/** C25/C26 news feed. Audience is gym-wide when teamId is NULL. */
export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gymId: uuid("gym_id").references(() => gyms.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    imageUrl: text("image_url"),
    pushSent: boolean("push_sent").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("announcements_gym_published_idx").on(t.gymId, t.publishedAt)],
);

export const announcementReads = pgTable(
  "announcement_reads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("announcement_reads_unique").on(t.announcementId, t.userId)],
);

/** In-app notification centre (C18). Push delivery is a separate job. */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKind("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    /** Deep-link payload: { screen, entityId }. */
    data: jsonb("data"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_created_idx").on(t.userId, t.createdAt)],
);

/** C31 reminder composer. `audience` is a saved filter, resolved at send time. */
export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    template: text("template"),
    body: text("body").notNull(),
    audience: jsonb("audience").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    recipientCount: jsonb("recipient_count"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reminders_coach_idx").on(t.coachId)],
);
