import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, schema } from "../db.js";
import { badRequest, conflict, notFound } from "../errors.js";
import { assertCanReadMember } from "../lib/access.js";
import { notify } from "../lib/notify.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

/** Answer shapes per question type, mirroring seed/catalog/survey-templates.json. */
function validateAnswer(type: string, value: unknown, options: unknown): string | null {
  const opts = (options ?? {}) as { choices?: string[]; min?: number; max?: number };
  switch (type) {
    case "single_choice":
      return typeof value === "string" && opts.choices?.includes(value) ? null : "must be one of the listed choices";
    case "multi_choice":
      return Array.isArray(value) && value.every((v) => opts.choices?.includes(v as string))
        ? null
        : "must be a subset of the listed choices";
    case "scale": {
      const n = Number(value);
      return Number.isFinite(n) && n >= (opts.min ?? 1) && n <= (opts.max ?? 10)
        ? null
        : `must be a number between ${opts.min ?? 1} and ${opts.max ?? 10}`;
    }
    case "boolean":
      return typeof value === "boolean" ? null : "must be true or false";
    case "date":
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : "must be YYYY-MM-DD";
    case "short_text":
    case "long_text":
      return typeof value === "string" && value.length > 0 ? null : "must be a non-empty string";
    default:
      return `unknown question type "${type}"`;
  }
}

export const surveyRoutes: FastifyPluginAsync = async (app) => {
  const auth = (req: Parameters<typeof app.requireAuth>[0]) => app.requireAuth(req);
  const coachOnly = app.requireRole("coach", "admin");

  /** Platform templates (NULL owner) plus the coach's own surveys. */
  app.get("/surveys", { preHandler: coachOnly }, async (req) => {
    const rows = await db
      .select()
      .from(schema.surveys)
      .where(or(isNull(schema.surveys.ownerCoachId), eq(schema.surveys.ownerCoachId, req.user!.id)))
      .orderBy(asc(schema.surveys.title));
    return { items: rows };
  });

  app.get("/surveys/:id", { preHandler: auth }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const survey = await db.query.surveys.findFirst({ where: eq(schema.surveys.id, id) });
    if (!survey) throw notFound("Survey");
    const questions = await db
      .select()
      .from(schema.surveyQuestions)
      .where(eq(schema.surveyQuestions.surveyId, id))
      .orderBy(asc(schema.surveyQuestions.position));
    return { survey, questions };
  });

  /**
   * Clone a platform template into the coach's own library. Assigning a
   * template directly would let one coach's edits reach every other coach.
   */
  app.post("/surveys/:id/clone", { preHandler: coachOnly }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const source = await db.query.surveys.findFirst({ where: eq(schema.surveys.id, id) });
    if (!source) throw notFound("Survey");

    const questions = await db
      .select()
      .from(schema.surveyQuestions)
      .where(eq(schema.surveyQuestions.surveyId, id))
      .orderBy(asc(schema.surveyQuestions.position));

    const survey = await db.transaction(async (tx) => {
      const [s] = await tx
        .insert(schema.surveys)
        .values({
          ownerCoachId: req.user!.id,
          slug: null, // slugs identify platform templates only
          title: source.title,
          description: source.description,
          status: "draft",
          repeats: source.repeats,
          isTemplate: false,
        })
        .returning();
      if (questions.length) {
        await tx.insert(schema.surveyQuestions).values(
          questions.map((q) => ({
            surveyId: s!.id,
            position: q.position,
            type: q.type,
            prompt: q.prompt,
            options: q.options,
            required: q.required,
          })),
        );
      }
      return s!;
    });

    reply.code(201);
    return { survey, questionsCloned: questions.length };
  });

  app.post("/surveys/:id/assign", { preHandler: coachOnly }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({ memberId: z.string().uuid(), dueDate: isoDate.optional() }).parse(req.body);

    const survey = await db.query.surveys.findFirst({ where: eq(schema.surveys.id, id) });
    if (!survey) throw notFound("Survey");
    if (survey.ownerCoachId === null) throw badRequest("Clone this template before assigning it", "template_not_assignable");
    await assertCanReadMember(req.user!, body.memberId);

    const [assignment] = await db
      .insert(schema.surveyAssignments)
      .values({ surveyId: id, memberId: body.memberId, dueDate: body.dueDate ?? null })
      .returning();

    await notify(
      body.memberId,
      "survey_assigned",
      "New survey to complete",
      body.dueDate ? `"${survey.title}" — due ${body.dueDate}` : `"${survey.title}"`,
      { surveyId: id, assignmentId: assignment!.id },
    );

    reply.code(201);
    return { assignment };
  });

  /** What a member has been asked to fill in, and whether they have. */
  app.get("/surveys/assigned", { preHandler: auth }, async (req) => {
    const { memberId } = z.object({ memberId: z.string().uuid().optional() }).parse(req.query);
    const member = memberId ?? req.user!.id;
    await assertCanReadMember(req.user!, member);

    const rows = await db
      .select({
        assignmentId: schema.surveyAssignments.id,
        dueDate: schema.surveyAssignments.dueDate,
        survey: {
          id: schema.surveys.id,
          title: schema.surveys.title,
          description: schema.surveys.description,
          repeats: schema.surveys.repeats,
        },
      })
      .from(schema.surveyAssignments)
      .innerJoin(schema.surveys, eq(schema.surveys.id, schema.surveyAssignments.surveyId))
      .where(eq(schema.surveyAssignments.memberId, member))
      .orderBy(asc(schema.surveyAssignments.dueDate));

    const surveyIds = rows.map((r) => r.survey.id);
    const responses = surveyIds.length
      ? await db
          .select({ surveyId: schema.surveyResponses.surveyId, cycleDate: schema.surveyResponses.cycleDate, submittedAt: schema.surveyResponses.submittedAt })
          .from(schema.surveyResponses)
          .where(and(eq(schema.surveyResponses.memberId, member), inArray(schema.surveyResponses.surveyId, surveyIds)))
      : [];

    return {
      items: rows.map((r) => ({
        ...r,
        responses: responses.filter((x) => x.surveyId === r.survey.id).length,
        lastSubmittedAt: responses.filter((x) => x.surveyId === r.survey.id).at(-1)?.submittedAt ?? null,
      })),
    };
  });

  /**
   * Submit a whole survey in one call. Answers are validated against each
   * question's own type and options, and written in one transaction --- a
   * half-saved response is worse than none, because it looks complete.
   */
  app.post("/surveys/:id/responses", { preHandler: auth }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        cycleDate: isoDate,
        answers: z.array(z.object({ questionId: z.string().uuid(), value: z.unknown() })).min(1),
      })
      .parse(req.body);

    const questions = await db
      .select()
      .from(schema.surveyQuestions)
      .where(eq(schema.surveyQuestions.surveyId, id));
    if (questions.length === 0) throw notFound("Survey");

    const byId = new Map(questions.map((q) => [q.id, q]));
    const problems: string[] = [];
    for (const a of body.answers) {
      const q = byId.get(a.questionId);
      if (!q) { problems.push(`${a.questionId}: not a question on this survey`); continue; }
      const issue = validateAnswer(q.type, a.value, q.options);
      if (issue) problems.push(`"${q.prompt}": ${issue}`);
    }
    const answered = new Set(body.answers.map((a) => a.questionId));
    for (const q of questions) {
      if (q.required && !answered.has(q.id)) problems.push(`"${q.prompt}": required`);
    }
    if (problems.length) throw badRequest(problems.join("; "), "answer_validation_failed");

    try {
      const response = await db.transaction(async (tx) => {
        const [r] = await tx
          .insert(schema.surveyResponses)
          .values({ surveyId: id, memberId: req.user!.id, cycleDate: body.cycleDate, submittedAt: new Date() })
          .returning();
        await tx.insert(schema.surveyAnswers).values(
          body.answers.map((a) => ({ responseId: r!.id, questionId: a.questionId, value: a.value as never })),
        );
        return r!;
      });
      reply.code(201);
      return { response };
    } catch (e) {
      // One response per member per cycle --- a repeating weekly check-in is
      // answered once a week, not once a tap.
      if ((e as { code?: string }).code === "23505") {
        throw conflict("You have already submitted this survey for that period");
      }
      throw e;
    }
  });

  /** A coach reading their member's answers. */
  app.get("/surveys/:id/responses", { preHandler: coachOnly }, async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { memberId } = z.object({ memberId: z.string().uuid() }).parse(req.query);
    await assertCanReadMember(req.user!, memberId);

    const responses = await db
      .select()
      .from(schema.surveyResponses)
      .where(and(eq(schema.surveyResponses.surveyId, id), eq(schema.surveyResponses.memberId, memberId)))
      .orderBy(desc(schema.surveyResponses.cycleDate));
    if (responses.length === 0) return { items: [] };

    const answers = await db
      .select({
        responseId: schema.surveyAnswers.responseId,
        value: schema.surveyAnswers.value,
        prompt: schema.surveyQuestions.prompt,
        type: schema.surveyQuestions.type,
        position: schema.surveyQuestions.position,
      })
      .from(schema.surveyAnswers)
      .innerJoin(schema.surveyQuestions, eq(schema.surveyQuestions.id, schema.surveyAnswers.questionId))
      .where(inArray(schema.surveyAnswers.responseId, responses.map((r) => r.id)))
      .orderBy(asc(schema.surveyQuestions.position));

    return {
      items: responses.map((r) => ({ ...r, answers: answers.filter((a) => a.responseId === r.id) })),
    };
  });
};
