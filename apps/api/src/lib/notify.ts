import { db, schema } from "../db.js";

type Kind =
  | "announcement" | "message" | "plan_assigned" | "session_reminder"
  | "hydration_reminder" | "survey_assigned" | "join_request" | "system";

/**
 * Creates in-app notifications.
 *
 * Every coach action that lands in a member's app writes one of these, so the
 * member has a single place that answers "what changed since I last looked?".
 * It never throws: a notification failing must not roll back the thing it is
 * announcing --- an assigned plan that exists with no badge is recoverable, a
 * plan that failed to save because a badge failed is not.
 */
export async function notify(
  userId: string,
  kind: Kind,
  title: string,
  body?: string,
  data?: Record<string, unknown>,
) {
  try {
    await db.insert(schema.notifications).values({
      userId,
      kind,
      title,
      body: body ?? null,
      data: (data ?? null) as never,
    });
  } catch (err) {
    console.error("notification failed", { userId, kind, err });
  }
}

export const notifyMany = (userIds: string[], ...rest: Parameters<typeof notify> extends [unknown, ...infer R] ? R : never) =>
  Promise.all(userIds.map((id) => notify(id, ...(rest as [Kind, string, string?, Record<string, unknown>?]))));
