import { and, eq } from "drizzle-orm";
import { db, schema } from "../db.js";
import { forbidden, notFound } from "../errors.js";

/**
 * Every cross-user read goes through here.
 *
 * The rule is narrow on purpose: a coach may only reach a member they have an
 * ACTIVE coach_members link to. Being in the same gym is not enough --- gyms
 * have many coaches, and a member's body metrics and food diary are not gym-wide
 * data. Admins bypass, members reach only themselves.
 */
export async function assertCanReadMember(
  actor: { id: string; role: "admin" | "coach" | "member" },
  memberId: string,
) {
  if (actor.role === "admin") return;
  if (actor.id === memberId) return;
  if (actor.role !== "coach") throw forbidden();

  const link = await db.query.coachMembers.findFirst({
    where: and(
      eq(schema.coachMembers.coachId, actor.id),
      eq(schema.coachMembers.memberId, memberId),
      eq(schema.coachMembers.status, "active"),
    ),
  });
  // 404 rather than 403: a coach should not be able to probe whether a given
  // user id exists on the platform.
  if (!link) throw notFound("Member");
}

/** A coach owns a gym only if they created it. */
export async function assertOwnsGym(actor: { id: string; role: string }, gymId: string) {
  if (actor.role === "admin") return;
  const gym = await db.query.gyms.findFirst({ where: eq(schema.gyms.id, gymId) });
  if (!gym) throw notFound("Gym");
  if (gym.ownerCoachId !== actor.id) throw forbidden("You do not own this gym");
}

/** A plan is editable by its owner, readable by anyone it is assigned to. */
export async function assertOwnsPlan(actor: { id: string; role: string }, planId: string) {
  if (actor.role === "admin") return;
  const plan = await db.query.plans.findFirst({ where: eq(schema.plans.id, planId) });
  if (!plan) throw notFound("Plan");
  if (plan.ownerCoachId !== actor.id) throw forbidden("You do not own this plan");
  return plan;
}

/** The member ids a coach is responsible for. */
export async function coachRoster(coachId: string) {
  return db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      avatarUrl: schema.users.avatarUrl,
      sex: schema.users.sex,
      activityLevel: schema.users.activityLevel,
      goalType: schema.users.goalType,
      since: schema.coachMembers.createdAt,
    })
    .from(schema.coachMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.coachMembers.memberId))
    .where(and(eq(schema.coachMembers.coachId, coachId), eq(schema.coachMembers.status, "active")))
    .orderBy(schema.users.name);
}
