import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { questionType, recurrence, surveyStatus } from "./enums";
import { gyms, teams } from "./gyms";
import { users } from "./identity";

/** C28 create survey / C29 assign / C30 analytics / M22 member answering. */
export const surveys = pgTable(
  "surveys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerCoachId: uuid("owner_coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: surveyStatus("status").notNull().default("draft"),
    repeats: recurrence("repeats").notNull().default("once"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("surveys_owner_idx").on(t.ownerCoachId)],
);

export const surveyQuestions = pgTable(
  "survey_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    type: questionType("type").notNull(),
    prompt: text("prompt").notNull(),
    /** Choice labels, or { min, max, minLabel, maxLabel } for scale questions. */
    options: jsonb("options"),
    required: boolean("required").notNull().default(true),
  },
  (t) => [index("survey_questions_survey_idx").on(t.surveyId, t.position)],
);

/** Exactly one of memberId / teamId is set, same pattern as plan assignments. */
export const surveyAssignments = pgTable(
  "survey_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
    dueDate: date("due_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("survey_assignments_survey_idx").on(t.surveyId),
    index("survey_assignments_member_idx").on(t.memberId),
  ],
);

export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Set when a recurring survey is answered per cycle. */
    cycleDate: date("cycle_date"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("survey_responses_unique").on(t.surveyId, t.memberId, t.cycleDate)],
);

export const surveyAnswers = pgTable(
  "survey_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => surveyResponses.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: "cascade" }),
    /** jsonb so one column serves scale ints, choice arrays and free text. */
    value: jsonb("value"),
  },
  (t) => [uniqueIndex("survey_answers_unique").on(t.responseId, t.questionId)],
);

/** C27 onboarding form builder --- the questions a new member answers on join. */
export const onboardingForms = pgTable(
  "onboarding_forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gymId: uuid("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Onboarding"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("onboarding_forms_gym_unique").on(t.gymId)],
);

export const onboardingQuestions = pgTable(
  "onboarding_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => onboardingForms.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    type: questionType("type").notNull(),
    prompt: text("prompt").notNull(),
    options: jsonb("options"),
    required: boolean("required").notNull().default(true),
  },
  (t) => [index("onboarding_questions_form_idx").on(t.formId, t.position)],
);

export const onboardingAnswers = pgTable(
  "onboarding_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => onboardingQuestions.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: jsonb("value"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("onboarding_answers_unique").on(t.questionId, t.memberId)],
);
