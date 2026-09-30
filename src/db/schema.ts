import { sql } from "drizzle-orm"
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

const id = () => uuid("id").primaryKey().defaultRandom()
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" })
const createdAt = () => ts("created_at").notNull().default(sql`now()`)

import type { BuildState, ExtractKind, Stage } from "../lib/flow"

export const verticals = pgTable("verticals", {
  id: id(),
  name: text("name").notNull(),
  hue: integer("hue").notNull().default(75),
  /** The two reference sites the build prompt points Claude Code at. Entered by hand. */
  reference1: text("reference1").notNull().default(""),
  reference2: text("reference2").notNull().default(""),
  target: integer("target").notNull().default(20),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
})

/** One firm = one site = one page. Created through the API (ChatGPT), never by hand. */
export const sites = pgTable(
  "sites",
  {
    id: id(),
    name: text("name").notNull(),
    verticalId: uuid("vertical_id")
      .notNull()
      .references(() => verticals.id, { onDelete: "cascade" }),
    city: text("city").notNull().default(""),
    oldSiteUrl: text("old_site_url").notNull().default(""),
    demoUrl: text("demo_url").notNull().default(""),
    contactName: text("contact_name").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    stage: text("stage").$type<Stage>().notNull().default("new"),
    /** When the current stage was entered; the follow-up timers count from here. */
    stageAt: ts("stage_at").notNull().default(sql`now()`),
    build: text("build").$type<BuildState>().notNull().default("todo"),
    /** Which opening question was used, so replies can be compared across questions. */
    questionVariant: text("question_variant").notNull().default(""),
    callAt: ts("call_at"),
    callNotes: text("call_notes").notNull().default(""),
    lostReason: text("lost_reason").notNull().default(""),
    dealValue: integer("deal_value"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().default(sql`now()`),
  },
  (t) => [index("sites_vertical_idx").on(t.verticalId), index("sites_email_idx").on(t.email)],
)

/** Every stage change, oldest first. Drives the timers and every metric. */
export const events = pgTable(
  "events",
  {
    id: id(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    stage: text("stage").$type<Stage>().notNull(),
    at: ts("at").notNull(),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("events_site_idx").on(t.siteId, t.at)],
)

/** The email conversation with a firm. Written by the ChatGPT sync, read-only in the app. */
export const messages = pgTable(
  "messages",
  {
    id: id(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    direction: text("direction").$type<"in" | "out">().notNull(),
    fromAddr: text("from_addr").notNull().default(""),
    toAddr: text("to_addr").notNull().default(""),
    subject: text("subject").notNull().default(""),
    body: text("body").notNull().default(""),
    at: ts("at").notNull(),
    externalId: text("external_id"),
    createdAt: createdAt(),
  },
  (t) => [index("messages_site_idx").on(t.siteId, t.at), uniqueIndex("messages_external_idx").on(t.externalId)],
)

/** What ChatGPT pulled out of the emails: objections, questions, signs of interest. */
export const extracts = pgTable(
  "extracts",
  {
    id: id(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ExtractKind>().notNull(),
    text: text("text").notNull(),
    messageId: uuid("message_id").references(() => messages.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("extracts_site_idx").on(t.siteId)],
)

export const lessons = pgTable(
  "lessons",
  {
    id: id(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("lessons_site_idx").on(t.siteId)],
)

/** Hand-made or ChatGPT-made tasks. Next steps in the flow are worked out live, not stored. */
export const tasks = pgTable("tasks", {
  id: id(),
  siteId: uuid("site_id").references(() => sites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  note: text("note").notNull().default(""),
  dueAt: ts("due_at"),
  doneAt: ts("done_at"),
  source: text("source").$type<"manual" | "chatgpt">().notNull().default("manual"),
  createdAt: createdAt(),
})

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})

export type Vertical = typeof verticals.$inferSelect
export type Site = typeof sites.$inferSelect
export type FlowEvent = typeof events.$inferSelect
export type Message = typeof messages.$inferSelect
export type Extract = typeof extracts.$inferSelect
export type Lesson = typeof lessons.$inferSelect
export type Task = typeof tasks.$inferSelect
