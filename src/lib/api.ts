import "server-only"
import { createHash, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { DomainError } from "./domain"
import { getWorld } from "./data"
import { buildRows, taskItems, timingOf, type SiteRow } from "./metrics"
import { STAGE_LABEL } from "./flow"
import { fillTemplate } from "./templates"

const digest = (s: string) => createHash("sha256").update(s).digest()

/** Every /api/v1 route runs through this: bearer token, JSON errors, cache refresh after writes. */
export function route<Ctx = unknown>(handler: (req: Request, ctx: Ctx) => Promise<Response | unknown>, opts: { write?: boolean } = {}) {
  return async (req: Request, ctx: Ctx) => {
    const token = process.env.API_TOKEN
    if (!token) return NextResponse.json({ error: "API_TOKEN is not set on the server, so the API is switched off." }, { status: 503 })
    const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "")
    if (!timingSafeEqual(digest(given), digest(token))) return NextResponse.json({ error: "Unauthorized: send the API token as `Authorization: Bearer <token>`." }, { status: 401 })
    try {
      const out = await handler(req, ctx)
      if (opts.write) revalidatePath("/", "layout")
      return out instanceof Response ? out : NextResponse.json(out)
    } catch (e) {
      if (e instanceof DomainError) return NextResponse.json({ error: e.message }, { status: e.status })
      if (e instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid request: " + e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ") }, { status: 400 })
      }
      console.error(e)
      return NextResponse.json({ error: "Server error." }, { status: 500 })
    }
  }
}

export async function json<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  const body = await req.json().catch(() => {
    throw new DomainError("Body must be valid JSON.")
  })
  return schema.parse(body)
}

export const dateString = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "must be an ISO 8601 date-time, e.g. 2026-10-05T14:30:00+02:00")

export function appUrl(req: Request) {
  const u = new URL(req.url)
  return `${req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "")}://${req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host}`
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)

export function siteSummary(r: SiteRow, base: string) {
  return {
    id: r.id,
    name: r.name,
    vertical: r.vertical?.name ?? null,
    city: r.city,
    oldSiteUrl: r.oldSiteUrl,
    demoUrl: r.demoUrl,
    email: r.email,
    phone: r.phone,
    contactName: r.contactName,
    stage: r.stage,
    stageLabel: STAGE_LABEL[r.stage],
    stageSince: iso(r.stageAt),
    build: r.build,
    questionVariant: r.questionVariant,
    callAt: iso(r.callAt),
    lostReason: r.lostReason,
    dealValue: r.dealValue,
    nextSteps: r.steps.map((s) => ({ kind: s.kind, title: s.title, state: s.state, due: s.due.toISOString(), doneBy: s.actions.map((a) => a.id) })),
    lastMessage: r.lastMessage ? { direction: r.lastMessage.direction, at: r.lastMessage.at.toISOString(), subject: r.lastMessage.subject } : null,
    messageCount: r.messages.length,
    pageUrl: `${base}/sites/${r.id}`,
  }
}

export async function siteDetail(id: string, base: string) {
  const world = await getWorld()
  const r = buildRows(world).find((x) => x.id === id)
  if (!r) throw new DomainError("Site not found.", 404)
  const vars = { name: r.name, city: r.city, oldSiteUrl: r.oldSiteUrl, demoUrl: r.demoUrl, contactName: r.contactName, vertical: r.vertical }
  return {
    ...siteSummary(r, base),
    callNotes: r.callNotes,
    messages: r.messages.map((m) => ({ id: m.id, direction: m.direction, at: m.at.toISOString(), subject: m.subject, body: m.body, from: m.fromAddr, to: m.toAddr })),
    extracts: r.extracts.map((e) => ({ id: e.id, kind: e.kind, text: e.text })),
    lessons: r.lessons.map((l) => ({ id: l.id, body: l.body })),
    history: r.events.map((e) => ({ stage: e.stage, at: e.at.toISOString(), note: e.note })),
    drafts: {
      buildPrompt: fillTemplate(world.templates.buildPrompt, vars).text,
      sendSiteEmail: fillTemplate(world.templates.sendSiteTemplate, vars).text,
      callSchedulingEmail: fillTemplate(world.templates.callSchedulingTemplate, vars).text,
    },
  }
}

export async function taskList(base: string) {
  const world = await getWorld()
  const rows = buildRows(world)
  return taskItems(rows, world.tasks)
    .filter((i) => i.state !== "done")
    .sort((a, b) => (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0))
    .map((i) =>
      i.source === "step"
        ? { id: i.key, source: "next_step", state: i.state, due: i.due.toISOString(), title: i.step.title, site: { id: i.site.id, name: i.site.name, email: i.site.email }, pageUrl: `${base}/sites/${i.site.id}` }
        : { id: i.task.id, source: "task", state: i.state, due: iso(i.due), title: i.task.title, note: i.task.note, site: i.site ? { id: i.site.id, name: i.site.name, email: i.site.email } : null },
    )
}

export { timingOf }
