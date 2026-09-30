import type { Extract, FlowEvent, Lesson, Message, Site, Task, Vertical } from "@/db/schema"
import { nextSteps, statusOf, type Stage, type Status, type Step, type Timing } from "./flow"
import type { Templates } from "./templates"

export type World = {
  verticals: Vertical[]
  sites: Site[]
  events: FlowEvent[]
  messages: Message[]
  extracts: Extract[]
  lessons: Lesson[]
  tasks: Task[]
  templates: Templates
  customised: { buildPrompt: boolean; sendSiteTemplate: boolean; callSchedulingTemplate: boolean }
  lastSyncAt: Date | null
  lastSyncNote: string
}

export const DAY = 86_400_000
const HOUR = 3_600_000

export function timingOf(t: Templates): Timing {
  return { siteFollowUpDays: t.siteFollowUpDays, callAfterSiteDays: t.callAfterSiteDays }
}

export type SiteRow = Site & {
  vertical: Vertical | undefined
  events: FlowEvent[]
  messages: Message[]
  extracts: Extract[]
  lessons: Lesson[]
  steps: Step[]
  status: Status
  reached: Set<Stage>
  lastActivityAt: Date
  lastMessage: Message | undefined
  firstContactAt: Date | null
  /** Time of the first event at a stage, or undefined. */
  at: (s: Stage) => Date | undefined
}

export function buildRows(world: World, now = new Date()): SiteRow[] {
  const vById = new Map(world.verticals.map((v) => [v.id, v]))
  const group = <T extends { siteId: string | null }>(xs: T[]) => {
    const m = new Map<string, T[]>()
    for (const x of xs) {
      if (!x.siteId) continue
      const a = m.get(x.siteId)
      if (a) a.push(x)
      else m.set(x.siteId, [x])
    }
    return m
  }
  const ev = group(world.events)
  const ms = group(world.messages)
  const ex = group(world.extracts)
  const ls = group(world.lessons)
  const timing = timingOf(world.templates)

  return world.sites.map((s) => {
    const events = (ev.get(s.id) ?? []).sort((a, b) => a.at.getTime() - b.at.getTime())
    const messages = (ms.get(s.id) ?? []).sort((a, b) => a.at.getTime() - b.at.getTime())
    const steps = nextSteps(s, timing, now)
    const first = new Map<Stage, Date>()
    for (const e of events) if (!first.has(e.stage)) first.set(e.stage, e.at)
    const stamps = [s.updatedAt.getTime(), ...events.map((e) => e.at.getTime()), ...messages.map((m) => m.at.getTime())]
    const contact = events.find((e) => e.stage === "question_sent" || e.stage === "site_sent")
    return {
      ...s,
      vertical: vById.get(s.verticalId),
      events,
      messages,
      extracts: ex.get(s.id) ?? [],
      lessons: ls.get(s.id) ?? [],
      steps,
      status: statusOf(s.stage, steps),
      reached: new Set(events.map((e) => e.stage)),
      lastActivityAt: new Date(Math.max(...stamps)),
      lastMessage: messages.at(-1),
      firstContactAt: contact?.at ?? null,
      at: (st: Stage) => first.get(st),
    }
  })
}

/* ------------------------------------------------------------------ tasks */

export type TaskItem =
  | { source: "step"; key: string; site: SiteRow; step: Step; due: Date; state: "due" | "upcoming" }
  | { source: "task"; key: string; task: Task; site: SiteRow | undefined; due: Date | null; state: "due" | "upcoming" | "done" }

/** Everything that needs doing: live next steps plus stored tasks, soonest first. */
export function taskItems(rows: SiteRow[], tasks: Task[], now = new Date()): TaskItem[] {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const out: TaskItem[] = []
  for (const r of rows) for (const step of r.steps) out.push({ source: "step", key: `${r.id}:${step.kind}`, site: r, step, due: step.due, state: step.state })
  for (const t of tasks) {
    const state = t.doneAt ? "done" : t.dueAt && t.dueAt.getTime() > now.getTime() ? "upcoming" : "due"
    out.push({ source: "task", key: t.id, task: t, site: t.siteId ? byId.get(t.siteId) : undefined, due: t.dueAt, state })
  }
  return out
}

export const dueTime = (i: TaskItem) => (i.due ? i.due.getTime() : 0)


/* ------------------------------------------------------------------ measures */

export type Funnel = { stage: Stage; label: string; count: number }[]

const FUNNEL: { stage: Stage; label: string }[] = [
  { stage: "question_sent", label: "Question sent" },
  { stage: "question_replied", label: "Replied to question" },
  { stage: "site_sent", label: "Site sent" },
  { stage: "site_replied", label: "Replied to site" },
  { stage: "site_positive", label: "Positive" },
  { stage: "called", label: "Call held" },
  { stage: "proposal_sent", label: "Proposal sent" },
  { stage: "won", label: "Paid" },
]

export function funnel(rows: SiteRow[]): Funnel {
  return [
    { stage: "new", label: "Added", count: rows.length },
    ...FUNNEL.map((f) => ({ ...f, count: rows.filter((r) => r.reached.has(f.stage)).length })),
  ]
}

/** A reply rate only counts sites whose answer is known: they replied, or the wait has run out. */
function rate(numerator: number, sites: number) {
  return sites ? numerator / sites : null
}

export type Rates = {
  questionSent: number
  questionResolved: number
  questionReplied: number
  questionRate: number | null
  siteSent: number
  siteResolved: number
  siteReplied: number
  siteRate: number | null
  positive: number
  positiveRate: number | null
  called: number
  won: number
  revenue: number
  medianQuestionReplyHours: number | null
  medianSiteReplyHours: number | null
}

export function rates(rows: SiteRow[], timing: Timing, now = new Date()): Rates {
  const q = rows.filter((r) => r.reached.has("question_sent"))
  const qResolved = q.filter((r) => r.reached.has("question_replied") || now.getTime() - (r.at("question_sent")?.getTime() ?? now.getTime()) >= timing.siteFollowUpDays * DAY)
  const qReplied = qResolved.filter((r) => r.reached.has("question_replied"))
  const s = rows.filter((r) => r.reached.has("site_sent"))
  const sResolved = s.filter((r) => r.reached.has("site_replied") || now.getTime() - (r.at("site_sent")?.getTime() ?? now.getTime()) >= timing.callAfterSiteDays * DAY)
  const sReplied = sResolved.filter((r) => r.reached.has("site_replied"))
  const positive = s.filter((r) => r.reached.has("site_positive") || r.reached.has("call_scheduled") || r.reached.has("called") || r.reached.has("proposal_sent") || r.reached.has("won"))
  const won = rows.filter((r) => r.stage === "won")
  return {
    questionSent: q.length,
    questionResolved: qResolved.length,
    questionReplied: qReplied.length,
    questionRate: rate(qReplied.length, qResolved.length),
    siteSent: s.length,
    siteResolved: sResolved.length,
    siteReplied: sReplied.length,
    siteRate: rate(sReplied.length, sResolved.length),
    positive: positive.length,
    positiveRate: rate(positive.filter((r) => sResolved.includes(r)).length, sResolved.length),
    called: rows.filter((r) => r.reached.has("called")).length,
    won: won.length,
    revenue: won.reduce((a, r) => a + (r.dealValue ?? 0), 0),
    medianQuestionReplyHours: median(replyHours(rows, "question_sent", "question_replied")),
    medianSiteReplyHours: median(replyHours(rows, "site_sent", "site_replied")),
  }
}

function replyHours(rows: SiteRow[], from: Stage, to: Stage) {
  const out: number[] = []
  for (const r of rows) {
    const a = r.at(from)
    const b = r.at(to)
    if (a && b && b >= a) out.push((b.getTime() - a.getTime()) / HOUR)
  }
  return out
}

export function median(xs: number[]) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** How long replies take to arrive, in buckets: shows whether the wait before the site goes out is right. */
export function replyDelays(rows: SiteRow[]) {
  const hours = [...replyHours(rows, "question_sent", "question_replied"), ...replyHours(rows, "site_sent", "site_replied")]
  const buckets = [
    { label: "< 1h", max: 1 },
    { label: "1–6h", max: 6 },
    { label: "6–24h", max: 24 },
    { label: "1–3 days", max: 72 },
    { label: "3+ days", max: Infinity },
  ]
  let lo = 0
  return buckets.map((b) => {
    const count = hours.filter((h) => h >= lo && h < b.max).length
    lo = b.max
    return { label: b.label, count }
  })
}

/** Does sending the site after a reply do better than after silence? */
export function pathComparison(rows: SiteRow[], timing: Timing, now = new Date()) {
  const sent = rows.filter((r) => r.reached.has("site_sent") && r.reached.has("question_sent"))
  const resolved = (r: SiteRow) => r.reached.has("site_replied") || now.getTime() - (r.at("site_sent")?.getTime() ?? now.getTime()) >= timing.callAfterSiteDays * DAY
  const isPos = (r: SiteRow) => r.reached.has("site_positive") || r.reached.has("call_scheduled") || r.reached.has("called") || r.reached.has("proposal_sent") || r.reached.has("won")
  const cut = (label: string, list: SiteRow[]) => {
    const res = list.filter(resolved)
    return { label, sent: list.length, resolved: res.length, replied: res.filter((r) => r.reached.has("site_replied")).length, positive: res.filter(isPos).length }
  }
  return [
    cut("Site sent after they replied", sent.filter((r) => r.reached.has("question_replied"))),
    cut("Site sent after silence", sent.filter((r) => !r.reached.has("question_replied"))),
  ]
}

export function byVertical(rows: SiteRow[], verticals: Vertical[], timing: Timing) {
  return verticals.map((v) => {
    const vr = rows.filter((r) => r.verticalId === v.id)
    return { vertical: v, rows: vr, ...rates(vr, timing) }
  })
}

/** Reply and positive rates per opening question, for the questions that were labelled. */
export function byQuestion(rows: SiteRow[], timing: Timing) {
  const names = [...new Set(rows.map((r) => r.questionVariant).filter(Boolean))]
  return names.map((name) => ({ name, ...rates(rows.filter((r) => r.questionVariant === name), timing) }))
}

/** Day-of-week the question went out vs. whether it got an answer. Monday first. */
export function byWeekday(rows: SiteRow[]) {
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  return names.map((label, i) => {
    const day = rows.filter((r) => {
      const d = r.at("question_sent")
      return d && (d.getDay() + 6) % 7 === i
    })
    return { label, sent: day.length, replied: day.filter((r) => r.reached.has("question_replied")).length }
  })
}

function startOfWeek(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

/** Pace of the experiment, week by week, oldest first. */
export function weekly(rows: SiteRow[], weeks = 10, now = new Date()) {
  const start = startOfWeek(now).getTime() - (weeks - 1) * 7 * DAY
  const b = Array.from({ length: weeks }, (_, i) => ({ week: new Date(start + i * 7 * DAY), added: 0, questions: 0, sites: 0, positives: 0 }))
  const idx = (d: Date) => Math.floor((d.getTime() - start) / (7 * DAY))
  const bump = (d: Date | undefined, key: "added" | "questions" | "sites" | "positives") => {
    if (!d) return
    const i = idx(d)
    if (i >= 0 && i < weeks) b[i][key]++
  }
  for (const r of rows) {
    bump(r.createdAt, "added")
    bump(r.at("question_sent"), "questions")
    bump(r.at("site_sent"), "sites")
    bump(r.at("site_positive"), "positives")
  }
  return b
}

/** Days from first contact to paid, for the sites that got there. */
export function daysToClose(rows: SiteRow[]) {
  const d = rows
    .filter((r) => r.at("won") && r.firstContactAt)
    .map((r) => (r.at("won")!.getTime() - r.firstContactAt!.getTime()) / DAY)
  return median(d)
}

/** Where sites were when they were closed as lost. */
export function lostAt(rows: SiteRow[]) {
  const m = new Map<Stage, number>()
  for (const r of rows) {
    if (r.stage !== "lost") continue
    const prev = [...r.events].reverse().find((e) => e.stage !== "lost")?.stage ?? "new"
    m.set(prev, (m.get(prev) ?? 0) + 1)
  }
  return [...m.entries()].map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count)
}
