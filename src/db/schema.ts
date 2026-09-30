import { sql } from "drizzle-orm"
import { integer, sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core"

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)

export const verticals = sqliteTable("verticals", {
  id: id(),
  name: text("name").notNull(),
  hue: integer("hue").notNull().default(80),
  /** Vertical-specific build notes appended to the master prompt (e.g. TENNIS.md). */
  playbook: text("playbook").notNull().default(""),
  target: integer("target").notNull().default(20),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
})

export const batches = sqliteTable("batches", {
  id: id(),
  name: text("name").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
})

export const prospects = sqliteTable(
  "prospects",
  {
    id: id(),
    name: text("name").notNull(),
    verticalId: text("vertical_id")
      .notNull()
      .references(() => verticals.id, { onDelete: "cascade" }),
    batchId: text("batch_id").references(() => batches.id, { onDelete: "set null" }),
    city: text("city").notNull().default(""),
    oldSiteUrl: text("old_site_url").notNull().default(""),
    demoUrl: text("demo_url").notNull().default(""),
    /** Newline separated reference sites used for the build. */
    references: text("references").notNull().default(""),
    contactName: text("contact_name").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    /** scouted → building → ready */
    build: text("build", { enum: ["scouted", "building", "ready"] })
      .notNull()
      .default("scouted"),
    buildMethod: text("build_method").notNull().default(""),
    /** Latest node reached in the outreach flow. Null = not contacted yet. */
    stage: text("stage"),
    parked: integer("parked", { mode: "boolean" }).notNull().default(false),
    dealValue: integer("deal_value"),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("prospects_vertical_idx").on(t.verticalId), index("prospects_batch_idx").on(t.batchId)],
)

/** Every step taken through the outreach flow, in order. */
export const events = sqliteTable(
  "events",
  {
    id: id(),
    prospectId: text("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    node: text("node").notNull(),
    at: integer("at", { mode: "timestamp_ms" }).notNull(),
    /** Optional rating of a reply: -1 negative, 0 neutral, 1 positive. */
    sentiment: integer("sentiment"),
    note: text("note").notNull().default(""),
    /** Call length for call nodes. */
    minutes: integer("minutes"),
    createdAt: createdAt(),
  },
  (t) => [index("events_prospect_idx").on(t.prospectId, t.at)],
)

export const workLogs = sqliteTable(
  "work_logs",
  {
    id: id(),
    prospectId: text("prospect_id").references(() => prospects.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["research", "build", "qa", "outreach", "sales", "admin"] })
      .notNull()
      .default("build"),
    minutes: integer("minutes").notNull().default(0),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    /** Null while the timer is running. */
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("work_prospect_idx").on(t.prospectId)],
)

export const notes = sqliteTable("notes", {
  id: id(),
  prospectId: text("prospect_id").references(() => prospects.id, { onDelete: "cascade" }),
  verticalId: text("vertical_id").references(() => verticals.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  isLesson: integer("is_lesson", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
})

/** Emails, either logged by hand or pushed in through /api/inbound. */
export const messages = sqliteTable(
  "messages",
  {
    id: id(),
    prospectId: text("prospect_id").references(() => prospects.id, { onDelete: "set null" }),
    direction: text("direction", { enum: ["in", "out"] }).notNull(),
    fromAddr: text("from_addr").notNull().default(""),
    toAddr: text("to_addr").notNull().default(""),
    subject: text("subject").notNull().default(""),
    body: text("body").notNull().default(""),
    at: integer("at", { mode: "timestamp_ms" }).notNull(),
    externalId: text("external_id"),
    rating: integer("rating"),
    source: text("source", { enum: ["manual", "webhook"] }).notNull().default("manual"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("messages_external_idx").on(t.externalId)],
)

export type Vertical = typeof verticals.$inferSelect
export type Batch = typeof batches.$inferSelect
export type Prospect = typeof prospects.$inferSelect
export type FlowEvent = typeof events.$inferSelect
export type WorkLog = typeof workLogs.$inferSelect
export type Note = typeof notes.$inferSelect
export type Message = typeof messages.$inferSelect

/** Small key/value store for app-wide settings (master prompt, chase delay…). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})
