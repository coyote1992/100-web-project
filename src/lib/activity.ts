import { STAGE_LABEL } from "./flow"
import type { World } from "./metrics"

export type ActivityItem = {
  id: string
  at: Date
  siteId: string
  kind: "stage" | "email" | "extract" | "lesson"
  title: string
  body?: string
}

const EXTRACT_VERB = { objection: "Objection", question: "Question", interest: "Interest", other: "Note" } as const

export function activity(world: World, opts: { siteId?: string; limit?: number; kinds?: ActivityItem["kind"][] } = {}) {
  const ok = (id: string) => !opts.siteId || id === opts.siteId
  const items: ActivityItem[] = []
  for (const e of world.events) {
    if (!ok(e.siteId) || e.stage === "new") continue
    items.push({ id: e.id, at: e.at, siteId: e.siteId, kind: "stage", title: STAGE_LABEL[e.stage], body: e.note || undefined })
  }
  for (const m of world.messages) {
    if (!ok(m.siteId)) continue
    items.push({ id: m.id, at: m.at, siteId: m.siteId, kind: "email", title: `${m.direction === "in" ? "Email from them" : "Email sent"}: ${m.subject || "(no subject)"}`, body: m.body.slice(0, 220) || undefined })
  }
  for (const x of world.extracts) {
    if (!ok(x.siteId)) continue
    items.push({ id: x.id, at: x.createdAt, siteId: x.siteId, kind: "extract", title: EXTRACT_VERB[x.kind], body: x.text })
  }
  for (const l of world.lessons) {
    if (!ok(l.siteId)) continue
    items.push({ id: l.id, at: l.createdAt, siteId: l.siteId, kind: "lesson", title: "Lesson", body: l.body })
  }
  const list = opts.kinds ? items.filter((i) => opts.kinds!.includes(i.kind)) : items
  list.sort((a, b) => b.at.getTime() - a.at.getTime())
  return opts.limit ? list.slice(0, opts.limit) : list
}
