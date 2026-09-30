import { NODES, WORK_KINDS, type NodeKey } from "./flow"
import { logMinutes, type World } from "./metrics"
import { minutes } from "./format"

export type ActivityItem = {
  id: string
  at: Date
  prospectId: string | null
  kind: "step" | "work" | "note" | "lesson" | "email"
  node?: NodeKey
  title: string
  body?: string
  sentiment?: number | null
  deletable?: { type: "work" | "note"; id: string }
}

const STEP_TEXT: Partial<Record<NodeKey, string>> = {
  question_sent: "Sent the opening question",
  question_no_reply: "No reply to the question",
  question_replied: "Replied to the question",
  site_sent: "Sent the demo site",
  site_no_reply: "No reply to the site",
  site_replied: "Replied to the site",
  call: "Called",
  site_negative: "Said no to the site",
  site_positive: "Positive about the site",
  call_negative: "Not interested on the call",
  call_proposal: "Call & proposal",
  proposal_negative: "Declined the proposal",
  paid: "Became a paid client",
}

export function activity(world: World, opts: { prospectId?: string; limit?: number; kinds?: ActivityItem["kind"][] } = {}) {
  const match = (pid: string | null) => !opts.prospectId || pid === opts.prospectId
  const items: ActivityItem[] = []

  for (const e of world.events) {
    if (!match(e.prospectId)) continue
    // "Reply" is implied by Positive/Negative when both were recorded in one click.
    if (
      e.node === "site_replied" &&
      world.events.some((x) => x.prospectId === e.prospectId && x.node !== e.node && Math.abs(x.at.getTime() - e.at.getTime()) < 5)
    )
      continue
    items.push({
      id: e.id,
      at: e.at,
      prospectId: e.prospectId,
      kind: "step",
      node: e.node as NodeKey,
      title: STEP_TEXT[e.node as NodeKey] ?? NODES[e.node as NodeKey]?.label ?? e.node,
      body: [e.note, e.minutes ? `${e.minutes} min call` : ""].filter(Boolean).join(" · ") || undefined,
      sentiment: e.sentiment,
    })
  }
  for (const w of world.workLogs) {
    if (!match(w.prospectId) || !w.endedAt) continue
    items.push({
      id: w.id,
      at: w.endedAt,
      prospectId: w.prospectId,
      kind: "work",
      title: `${minutes(logMinutes(w))} · ${WORK_KINDS.find((k) => k.key === w.kind)?.label ?? w.kind}`,
      body: w.note || undefined,
      deletable: { type: "work", id: w.id },
    })
  }
  for (const n of world.notes) {
    if (!match(n.prospectId)) continue
    if (opts.prospectId === undefined && !n.prospectId && !n.isLesson) continue
    items.push({
      id: n.id,
      at: n.createdAt,
      prospectId: n.prospectId,
      kind: n.isLesson ? "lesson" : "note",
      title: n.isLesson ? "Lesson" : "Note",
      body: n.body,
      deletable: { type: "note", id: n.id },
    })
  }
  for (const m of world.messages) {
    if (!match(m.prospectId)) continue
    items.push({
      id: m.id,
      at: m.at,
      prospectId: m.prospectId,
      kind: "email",
      title: m.direction === "in" ? `Email in · ${m.subject || "(no subject)"}` : `Email out · ${m.subject || "(no subject)"}`,
      body: m.body ? m.body.slice(0, 280) : undefined,
      sentiment: m.rating,
    })
  }

  const filtered = opts.kinds ? items.filter((i) => opts.kinds!.includes(i.kind)) : items
  filtered.sort((a, b) => b.at.getTime() - a.at.getTime())
  return opts.limit ? filtered.slice(0, opts.limit) : filtered
}
