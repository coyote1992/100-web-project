import type { Batch, FlowEvent, Message, Note, Prospect, Vertical, WorkLog } from "@/db/schema"
import { NODE_KEYS, NODES, POSITIVE_NODES, SPECULATIVE_KINDS, statusOf, type NodeKey } from "./flow"

export type World = {
  verticals: Vertical[]
  batches: Batch[]
  prospects: Prospect[]
  events: FlowEvent[]
  workLogs: WorkLog[]
  notes: Note[]
  messages: Message[]
}

export type ProspectRow = Prospect & {
  vertical: Vertical | undefined
  batch: Batch | undefined
  events: FlowEvent[]
  specMinutes: number
  totalMinutes: number
  reached: Set<NodeKey>
  positive: boolean
  status: ReturnType<typeof statusOf>
  lastActivityAt: Date
  firstContactAt: Date | null
  unreadIn: number
}

const DAY = 86_400_000

export function logMinutes(w: WorkLog, now = Date.now()) {
  if (w.endedAt) return w.minutes
  return w.minutes + Math.max(0, Math.round((now - w.startedAt.getTime()) / 60_000))
}

export function buildRows(world: World): ProspectRow[] {
  const vById = new Map(world.verticals.map((v) => [v.id, v]))
  const bById = new Map(world.batches.map((b) => [b.id, b]))
  const evBy = group(world.events, (e) => e.prospectId)
  const wlBy = group(world.workLogs.filter((w) => w.prospectId), (w) => w.prospectId!)
  const msgBy = group(world.messages.filter((m) => m.prospectId), (m) => m.prospectId!)
  const noteBy = group(world.notes.filter((n) => n.prospectId), (n) => n.prospectId!)

  return world.prospects.map((p) => {
    const events = (evBy.get(p.id) ?? []).sort((a, b) => a.at.getTime() - b.at.getTime())
    const logs = wlBy.get(p.id) ?? []
    const reached = new Set(events.map((e) => e.node as NodeKey))
    const stamps = [
      p.updatedAt.getTime(),
      ...events.map((e) => e.at.getTime()),
      ...logs.map((l) => (l.endedAt ?? l.startedAt).getTime()),
      ...(msgBy.get(p.id) ?? []).map((m) => m.at.getTime()),
      ...(noteBy.get(p.id) ?? []).map((n) => n.createdAt.getTime()),
    ]
    return {
      ...p,
      vertical: vById.get(p.verticalId),
      batch: p.batchId ? bById.get(p.batchId) : undefined,
      events,
      specMinutes: sum(logs.filter((l) => SPECULATIVE_KINDS.includes(l.kind)).map((l) => logMinutes(l))),
      totalMinutes: sum(logs.map((l) => logMinutes(l))),
      reached,
      positive: POSITIVE_NODES.some((n) => reached.has(n)),
      status: statusOf(p.stage, p.parked),
      lastActivityAt: new Date(Math.max(...stamps)),
      firstContactAt: events[0]?.at ?? null,
      unreadIn: (msgBy.get(p.id) ?? []).filter((m) => m.direction === "in" && m.rating === null).length,
    }
  })
}

export type Stats = {
  count: number
  ready: number
  contacted: number
  positives: number
  won: number
  revenue: number
  specHours: number
  totalHours: number
  /** Positive responses per hour of speculative work. */
  pph: number | null
  /** Positive responses per site contacted. */
  positiveRate: number | null
  hoursPerSite: number | null
}

export function stats(rows: ProspectRow[]): Stats {
  const contacted = rows.filter((r) => r.stage).length
  const positives = rows.filter((r) => r.positive).length
  const specMinutes = sum(rows.map((r) => r.specMinutes))
  const specHours = specMinutes / 60
  const worked = rows.filter((r) => r.specMinutes > 0).length
  return {
    count: rows.length,
    ready: rows.filter((r) => r.build === "ready").length,
    contacted,
    positives,
    won: rows.filter((r) => r.stage === "paid").length,
    revenue: sum(rows.filter((r) => r.stage === "paid").map((r) => r.dealValue ?? 0)),
    specHours,
    totalHours: sum(rows.map((r) => r.totalMinutes)) / 60,
    pph: specHours > 0 ? positives / specHours : null,
    positiveRate: contacted > 0 ? positives / contacted : null,
    hoursPerSite: worked > 0 ? specHours / worked : null,
  }
}

/** How many prospects ever reached each node, and walked each edge. */
export function flowCounts(rows: ProspectRow[]) {
  const nodes = Object.fromEntries(NODE_KEYS.map((k) => [k, 0])) as Record<NodeKey, number>
  const edges = new Map<string, number>()
  for (const r of rows) {
    for (const k of r.reached) nodes[k]++
    const path = r.events.map((e) => e.node as NodeKey)
    for (let i = 1; i < path.length; i++) {
      const key = `${path[i - 1]}>${path[i]}`
      edges.set(key, (edges.get(key) ?? 0) + 1)
    }
  }
  return { nodes, edges }
}

export function replyRates(rows: ProspectRow[]) {
  const q = rows.filter((r) => r.reached.has("question_sent"))
  const qAnswered = q.filter((r) => r.reached.has("question_replied"))
  const s = rows.filter((r) => r.reached.has("site_sent"))
  const sAnswered = s.filter((r) => r.reached.has("site_replied"))
  const qResolved = q.filter((r) => r.reached.has("question_replied") || r.reached.has("question_no_reply"))
  const sResolved = s.filter((r) => r.reached.has("site_replied") || r.reached.has("site_no_reply"))

  const replyDays: number[] = []
  for (const r of rows) {
    for (const [from, to] of [
      ["question_sent", "question_replied"],
      ["site_sent", "site_replied"],
    ] as const) {
      const a = r.events.find((e) => e.node === from)
      const b = r.events.find((e) => e.node === to)
      if (a && b) replyDays.push((b.at.getTime() - a.at.getTime()) / DAY)
    }
  }

  return {
    question: { sent: q.length, replied: qAnswered.length, rate: qResolved.length ? qAnswered.length / qResolved.length : null },
    site: { sent: s.length, replied: sAnswered.length, rate: sResolved.length ? sAnswered.length / sResolved.length : null },
    medianReplyDays: median(replyDays),
  }
}

export function byVertical(rows: ProspectRow[], verticals: Vertical[]) {
  return verticals.map((v) => {
    const vr = rows.filter((r) => r.verticalId === v.id)
    return { vertical: v, rows: vr, ...stats(vr), ...replyRates(vr) }
  })
}

export function byBatch(rows: ProspectRow[], batches: Batch[]) {
  return batches
    .map((b) => {
      const br = rows.filter((r) => r.batchId === b.id)
      const s = stats(br)
      return { batch: b, rows: br, size: br.length, ...s }
    })
    .sort((a, b) => a.batch.createdAt.getTime() - b.batch.createdAt.getTime())
}

/** Week-by-week effort and outcomes, oldest first. */
export function weekly(rows: ProspectRow[], logs: WorkLog[], weeks = 10, now = new Date()) {
  const start = startOfWeek(now).getTime() - (weeks - 1) * 7 * DAY
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    week: new Date(start + i * 7 * DAY),
    hours: 0,
    sent: 0,
    positives: 0,
  }))
  const idx = (d: Date) => Math.floor((d.getTime() - start) / (7 * DAY))
  for (const l of logs) {
    const i = idx(l.startedAt)
    if (i >= 0 && i < weeks && SPECULATIVE_KINDS.includes(l.kind)) buckets[i].hours += logMinutes(l) / 60
  }
  for (const r of rows) {
    for (const e of r.events) {
      const i = idx(e.at)
      if (i >= 0 && i < weeks && e.node === "site_sent") buckets[i].sent++
    }
    const firstPositive = r.events.find((e) => POSITIVE_NODES.includes(e.node as NodeKey))
    if (firstPositive) {
      const i = idx(firstPositive.at)
      if (i >= 0 && i < weeks) buckets[i].positives++
    }
  }
  return buckets.map((b) => ({ ...b, hours: Math.round(b.hours * 10) / 10 }))
}

export type Attention = { row: ProspectRow; reason: string; tone: "move" | "chase" | "inbox" }

/** The short list of things that need you today. */
export function attention(rows: ProspectRow[], now = Date.now(), chaseAfterDays = 4): Attention[] {
  const out: Attention[] = []
  for (const r of rows) {
    if (r.parked) continue
    if (r.unreadIn > 0) {
      out.push({ row: r, reason: `${r.unreadIn} new email${r.unreadIn > 1 ? "s" : ""} to rate`, tone: "inbox" })
      continue
    }
    if (r.status === "your_move") {
      const next = r.stage === "site_positive" ? "Book the call" : r.stage === "site_no_reply" ? "Call them" : r.stage === "call" ? "Record the call outcome" : "Send the site"
      out.push({ row: r, reason: next, tone: "move" })
      continue
    }
    if (!r.stage && r.build === "ready") {
      out.push({ row: r, reason: "Demo ready — start outreach", tone: "move" })
      continue
    }
    if (r.status === "waiting") {
      const last = r.events.at(-1)
      const days = last ? (now - last.at.getTime()) / DAY : 0
      if (days >= chaseAfterDays) out.push({ row: r, reason: `${Math.floor(days)} days quiet — chase or mark no reply`, tone: "chase" })
    }
  }
  const order = { inbox: 0, move: 1, chase: 2 }
  return out.sort((a, b) => order[a.tone] - order[b.tone] || a.row.lastActivityAt.getTime() - b.row.lastActivityAt.getTime())
}

export function nodeLabel(k: NodeKey) {
  return NODES[k].label
}

function group<T>(xs: T[], key: (x: T) => string) {
  const m = new Map<string, T[]>()
  for (const x of xs) {
    const k = key(x)
    const arr = m.get(k)
    if (arr) arr.push(x)
    else m.set(k, [x])
  }
  return m
}

function sum(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0)
}

function median(xs: number[]) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x
}
