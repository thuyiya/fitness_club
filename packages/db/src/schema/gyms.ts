import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { gymStatus, membershipStatus, reportReason, reportStatus, requestStatus, userStatus } from "./enums.js";
import { users } from "./identity.js";

export const gyms = pgTable(
  "gyms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** The coach who runs it. Admin can reassign (A04/A05). */
    ownerCoachId: uuid("owner_coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    address: text("address"),
    city: text("city"),
    country: text("country"),
    phone: text("phone"),
    website: text("website"),
    /**
     * The link a coach pastes from Google Maps, kept verbatim so "open in maps"
     * reproduces exactly what they intended --- a place id or plus code survives
     * here even when it cannot be reduced to a coordinate.
     */
    mapsUrl: text("maps_url"),
    /**
     * Resolved coordinates. Stored separately from mapsUrl because the preview
     * needs numbers, and because the link may be a short form that has to be
     * expanded once rather than on every render.
     */
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
    coverImageUrl: text("cover_image_url"),
    capacity: integer("capacity"),
    /** Coach-created gyms start pending; an admin promotes them to active. */
    status: gymStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gyms_owner_idx").on(t.ownerCoachId)],
);

/** Membership of a person in a gym. The join table the whole app hangs off. */
export const gymMembers = pgTable(
  "gym_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gymId: uuid("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: membershipStatus("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("gym_members_unique").on(t.gymId, t.userId),
    index("gym_members_user_idx").on(t.userId),
  ],
);

/** Direct coach-to-member relationship, independent of gym (a coach may follow a member across gyms). */
export const coachMembers = pgTable(
  "coach_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: membershipStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("coach_members_unique").on(t.coachId, t.memberId),
    index("coach_members_member_idx").on(t.memberId),
  ],
);

/** C20 join-request inbox / M16 "Request" button. */
export const joinRequests = pgTable(
  "join_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gymId: uuid("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: requestStatus("status").notNull().default("pending"),
    message: text("message"),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("join_requests_gym_status_idx").on(t.gymId, t.status),
    // Partial: only ONE *pending* request per member per gym. A plain unique on
    // (gym, member, status) would let a member be rejected only once, ever.
    uniqueIndex("join_requests_pending_unique")
      .on(t.gymId, t.memberId)
      .where(sql`${t.status} = 'pending'`),
  ],
);

/** C21/C22 teams --- a named subset of a gym's members that can be assigned plans together. */
export const teams = pgTable(
  "teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gymId: uuid("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("teams_gym_idx").on(t.gymId)],
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("team_members_unique").on(t.teamId, t.userId),
    index("team_members_user_idx").on(t.userId),
  ],
);

/** A07 override panel --- what the admin has enabled on a coach's behalf. */
export const coachPermissions = pgTable(
  "coach_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    canEditMemberPlans: boolean("can_edit_member_plans").notNull().default(true),
    canApproveRequests: boolean("can_approve_requests").notNull().default(true),
    canSendAnnouncements: boolean("can_send_announcements").notNull().default(false),
    canAccessBilling: boolean("can_access_billing").notNull().default(false),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("coach_permissions_coach_unique").on(t.coachId)],
);

/**
 * Append-only audit trail. Feeds A02 "recent activity" and A07 "recent overrides",
 * and is the thing you will want when someone asks "who changed this member's plan".
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_created_idx").on(t.createdAt),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
  ],
);


/**
 * A complaint raised against a gym, for an admin to act on.
 *
 * Kept separate from join requests and audit logs: a report is about conduct,
 * has its own lifecycle, and an admin needs to see the history before deciding
 * whether to approve or suspend the gym it concerns.
 */
export const gymReports = pgTable(
  "gym_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gymId: uuid("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "cascade" }),
    /** Null when the reporter's account has since been deleted. */
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    reason: reportReason("reason").notNull(),
    detail: text("detail"),
    status: reportStatus("status").notNull().default("open"),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolutionNote: text("resolution_note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("gym_reports_gym_idx").on(t.gymId, t.status),
    index("gym_reports_status_idx").on(t.status),
  ],
);
