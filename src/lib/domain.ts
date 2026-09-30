import "server-only"
import { and, desc, eq, sql } from "drizzle-orm"
import { getDb, schema } from "@/db"
import type { Site } from "@/db/schema"
import { BUILD_STATES, EXTRACT_KINDS, isStage, type BuildState, type ExtractKind, type Stage } from "./flow"
import { host } from "./format"
import { DEFAULT_TEMPLATES, TEMPLATE_KEYS } from "./templates"

const { sites, verticals, events, messages, extracts, lessons, tasks, settings } = schema

export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message)
  }
}

export function toDate(x: string | number | Date | null | undefined, fallback = new Date()) {
  if (x === null || x === undefined || x === "") return fallback
  const d = new Date(x)
  if (Number.isNaN(d.getTime())) throw new DomainError(`"${x}" is not a valid date. Use ISO 8601, e.g. 2026-10-05T14:30:00+02:00.`)
  return d
}

/* ------------------------------------------------------------------ sites */

const FREEMAIL = new Set(["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "freemail.hu", "citromail.hu", "t-online.hu"])

export function address(s: string) {
  const m = s.match(/<([^>]+)>/)
  return (m ? m[1] : s).trim().toLowerCase()
}

/** Match an address to a site: exact email first, then the firm's own domain. */
export function matchSite(all: Site[], addr: string) {
  const a = address(addr)
  if (!a) return undefined
  const exact = all.find((s) => s.email && address(s.email) === a)
  if (exact) return exact
  const domain = a.split("@")[1]
  if (!domain || FREEMAIL.has(domain)) return undefined
  return all.find((s) => [s.oldSiteUrl, s.demoUrl, s.email.split("@")[1] ?? ""].some((u) => u && host(u).toLowerCase() === domain))
}

export type SiteInput = {
  name: string
  vertical: string
  city?: string
  oldSiteUrl?: string
  email?: string
  phone?: string
  contactName?: string
}

/** Vertical by id or (case-insensitive) name. */
export async function findVertical(ref: string) {
  const db = await getDb()
  const all = await db.select().from(verticals)
  const v = all.find((x) => x.id === ref) ?? all.find((x) => x.name.trim().toLowerCase() === ref.trim().toLowerCase())
  if (!v) throw new DomainError(`Unknown vertical "${ref}". Existing verticals: ${all.map((x) => x.name).join(", ") || "none yet (create them in the app first)"}.`, 422)
  return v
}

export async function createSites(inputs: SiteInput[]) {
  const db = await getDb()
  const existing = await db.select().from(sites)
  const results: { name: string; id?: string; created: boolean; note?: string }[] = []
  for (const input of inputs) {
    const v = await findVertical(input.vertical)
    const dupe = existing.find(
      (s) =>
        s.verticalId === v.id &&
        ((input.oldSiteUrl && s.oldSiteUrl && host(s.oldSiteUrl) === host(input.oldSiteUrl)) || (input.email && s.email && address(s.email) === address(input.email))),
    )
    if (dupe) {
      results.push({ name: dupe.name, id: dupe.id, created: false, note: "Already exists (same website or email in this vertical)." })
      continue
    }
    const now = new Date()
    const [row] = await db
      .insert(sites)
      .values({
        name: input.name.trim(),
        verticalId: v.id,
        city: input.city?.trim() ?? "",
        oldSiteUrl: input.oldSiteUrl?.trim() ?? "",
        email: input.email?.trim() ?? "",
        phone: input.phone?.trim() ?? "",
        contactName: input.contactName?.trim() ?? "",
        stage: "new",
        stageAt: now,
      })
      .returning()
    await db.insert(events).values({ siteId: row.id, stage: "new", at: now })
    existing.push(row)
    results.push({ name: row.name, id: row.id, created: true })
  }
  return results
}

export type StageOpts = { at?: Date; note?: string; callAt?: Date | null; dealValue?: number | null; lostReason?: string }

export async function setStage(siteId: string, stage: Stage, opts: StageOpts = {}) {
  const db = await getDb()
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId))
  if (!site) throw new DomainError("Site not found.", 404)
  if (site.stage === stage && !opts.callAt && opts.dealValue == null) return site
  const at = opts.at ?? new Date()
  const reason = opts.lostReason ?? opts.note ?? ""
  if (site.stage !== stage) {
    // Backdated steps (mail synced later) must not sort before the "added" entry.
    const [first] = await db.select().from(events).where(eq(events.siteId, siteId)).orderBy(events.at).limit(1)
    if (first && first.stage === "new" && first.at.getTime() >= at.getTime()) {
      const earlier = new Date(at.getTime() - 60_000)
      await db.update(events).set({ at: earlier }).where(eq(events.id, first.id))
      if (site.createdAt.getTime() > earlier.getTime()) await db.update(sites).set({ createdAt: earlier }).where(eq(sites.id, siteId))
    }
    await db.insert(events).values({ siteId, stage, at, note: stage === "lost" ? reason : (opts.note ?? "") })
  }
  const [row] = await db
    .update(sites)
    .set({
      stage,
      stageAt: site.stage === stage ? site.stageAt : at,
      updatedAt: new Date(),
      ...(opts.callAt !== undefined ? { callAt: opts.callAt } : {}),
      ...(opts.dealValue != null ? { dealValue: opts.dealValue } : {}),
      ...(stage === "lost" ? { lostReason: reason } : {}),
    })
    .where(eq(sites.id, siteId))
    .returning()
  return row
}

/** Remove the latest stage change and go back to the one before it. */
export async function undoStage(siteId: string) {
  const db = await getDb()
  const evs = await db.select().from(events).where(eq(events.siteId, siteId)).orderBy(desc(events.at))
  if (evs.length <= 1) throw new DomainError("Nothing to undo.")
  await db.delete(events).where(eq(events.id, evs[0].id))
  const prev = evs[1]
  await db
    .update(sites)
    .set({ stage: prev.stage, stageAt: prev.at, updatedAt: new Date(), ...(evs[0].stage === "lost" ? { lostReason: "" } : {}) })
    .where(eq(sites.id, siteId))
}

export type SitePatch = Partial<{
  name: string
  vertical: string
  city: string
  oldSiteUrl: string
  demoUrl: string
  email: string
  phone: string
  contactName: string
  build: BuildState
  questionVariant: string
  callAt: string | null
  callNotes: string
  lostReason: string
  dealValue: number | null
  stage: string
  stageAt: string
  note: string
}>

export async function updateSite(id: string, patch: SitePatch) {
  const db = await getDb()
  const [site] = await db.select().from(sites).where(eq(sites.id, id))
  if (!site) throw new DomainError("Site not found.", 404)
  const set: Partial<typeof sites.$inferInsert> = { updatedAt: new Date() }
  const str = (k: "name" | "city" | "oldSiteUrl" | "demoUrl" | "email" | "phone" | "contactName" | "questionVariant" | "callNotes" | "lostReason") => {
    if (patch[k] !== undefined) set[k] = String(patch[k]).trim()
  }
  ;(["name", "city", "oldSiteUrl", "demoUrl", "email", "phone", "contactName", "questionVariant", "callNotes", "lostReason"] as const).forEach(str)
  if (patch.vertical) set.verticalId = (await findVertical(patch.vertical)).id
  if (patch.build !== undefined) {
    if (!BUILD_STATES.includes(patch.build)) throw new DomainError(`build must be one of ${BUILD_STATES.join(", ")}.`)
    set.build = patch.build
  } else if (set.demoUrl && site.build !== "ready") set.build = "ready" // a demo link means the site exists
  if (patch.dealValue !== undefined) set.dealValue = patch.dealValue
  if (patch.callAt !== undefined) set.callAt = patch.callAt ? toDate(patch.callAt) : null
  if (patch.name !== undefined && !set.name) throw new DomainError("name can't be empty.")
  await db.update(sites).set(set).where(eq(sites.id, id))

  let stage: Stage | undefined
  if (patch.stage !== undefined) {
    if (!isStage(patch.stage)) throw new DomainError(`Unknown stage "${patch.stage}".`)
    stage = patch.stage
  } else if (set.callAt && ["site_sent", "site_replied", "site_positive", "call_scheduling"].includes(site.stage)) {
    stage = "call_scheduled" // a booked time means the call is scheduled
  }
  if (stage) await setStage(id, stage, { at: patch.stageAt ? toDate(patch.stageAt) : undefined, note: patch.note, lostReason: patch.lostReason })
  const [row] = await db.select().from(sites).where(eq(sites.id, id))
  return row
}

export async function deleteSite(id: string) {
  const db = await getDb()
  await db.delete(sites).where(eq(sites.id, id))
}

/* ------------------------------------------------------------------ messages */

export type MessageInput = {
  siteId?: string
  /** The firm's email address, when the site id isn't known. */
  email?: string
  direction: "in" | "out"
  from?: string
  to?: string
  subject?: string
  body?: string
  at?: string
  externalId?: string
  /** For outgoing mail: which step this email was. Moves the site to the matching stage. */
  sentKind?: "question" | "site" | "call_scheduling"
  questionVariant?: string
}

export async function ingestMessage(input: MessageInput) {
  const db = await getDb()
  const all = await db.select().from(sites)
  let site: Site | undefined
  if (input.siteId) site = all.find((s) => s.id === input.siteId)
  else {
    const counterpart = input.email ?? (input.direction === "in" ? input.from : input.to) ?? ""
    site = matchSite(all, counterpart)
  }
  if (!site) throw new DomainError(`No site matches ${input.siteId ?? input.email ?? input.from ?? input.to ?? "this message"}. Add the site first, or pass its siteId.`, 422)

  const at = toDate(input.at)
  const inserted = await db
    .insert(messages)
    .values({
      siteId: site.id,
      direction: input.direction,
      fromAddr: input.from ?? "",
      toAddr: input.to ?? "",
      subject: input.subject ?? "",
      body: (input.body ?? "").slice(0, 30000),
      at,
      externalId: input.externalId ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: messages.id })
  if (!inserted.length) return { duplicate: true as const, site, stageChanged: false }

  let target: Stage | undefined
  if (input.direction === "in") {
    if (at >= site.stageAt) {
      if (site.stage === "question_sent") target = "question_replied"
      else if (site.stage === "site_sent") target = "site_replied"
    }
  } else if (input.sentKind === "question" && site.stage === "new") target = "question_sent"
  else if (input.sentKind === "site" && ["new", "question_sent", "question_replied"].includes(site.stage)) target = "site_sent"
  else if (input.sentKind === "call_scheduling" && ["site_positive", "site_replied"].includes(site.stage)) target = "call_scheduling"

  if (input.questionVariant) await db.update(sites).set({ questionVariant: input.questionVariant.trim() }).where(eq(sites.id, site.id))
  let current = site
  if (target) current = await setStage(site.id, target, { at })
  else await db.update(sites).set({ updatedAt: new Date() }).where(eq(sites.id, site.id))
  return { duplicate: false as const, messageId: inserted[0].id, site: current, stageChanged: !!target }
}

/* ------------------------------------------------------------------ extracts, lessons, tasks */

export async function addExtract(siteId: string, kind: ExtractKind, text: string, messageId?: string | null) {
  if (!EXTRACT_KINDS.includes(kind)) throw new DomainError(`kind must be one of ${EXTRACT_KINDS.join(", ")}.`)
  if (!text.trim()) throw new DomainError("text can't be empty.")
  const db = await getDb()
  const [site] = await db.select({ id: sites.id }).from(sites).where(eq(sites.id, siteId))
  if (!site) throw new DomainError("Site not found.", 404)
  const dupe = await db.select({ id: extracts.id }).from(extracts).where(and(eq(extracts.siteId, siteId), eq(extracts.kind, kind), eq(extracts.text, text.trim())))
  if (dupe.length) return { id: dupe[0].id, duplicate: true }
  const [row] = await db.insert(extracts).values({ siteId, kind, text: text.trim(), messageId: messageId ?? null }).returning({ id: extracts.id })
  await db.update(sites).set({ updatedAt: new Date() }).where(eq(sites.id, siteId))
  return { id: row.id, duplicate: false }
}

export async function deleteExtract(id: string) {
  const db = await getDb()
  await db.delete(extracts).where(eq(extracts.id, id))
}

export async function addLesson(siteId: string, body: string) {
  if (!body.trim()) throw new DomainError("body can't be empty.")
  const db = await getDb()
  const [row] = await db.insert(lessons).values({ siteId, body: body.trim() }).returning({ id: lessons.id })
  return row
}

export async function updateLesson(id: string, body: string) {
  const db = await getDb()
  await db.update(lessons).set({ body: body.trim() }).where(eq(lessons.id, id))
}

export async function deleteLesson(id: string) {
  const db = await getDb()
  await db.delete(lessons).where(eq(lessons.id, id))
}

export async function addTask(input: { siteId?: string | null; title: string; note?: string; dueAt?: string | null; source: "manual" | "chatgpt" }) {
  if (!input.title.trim()) throw new DomainError("title can't be empty.")
  const db = await getDb()
  const [row] = await db
    .insert(tasks)
    .values({ siteId: input.siteId ?? null, title: input.title.trim(), note: input.note ?? "", dueAt: input.dueAt ? toDate(input.dueAt) : null, source: input.source })
    .returning()
  return row
}

export async function setTaskDone(id: string, done: boolean) {
  const db = await getDb()
  const [row] = await db.update(tasks).set({ doneAt: done ? new Date() : null }).where(eq(tasks.id, id)).returning()
  if (!row) throw new DomainError("Task not found.", 404)
  return row
}

export async function deleteTask(id: string) {
  const db = await getDb()
  await db.delete(tasks).where(eq(tasks.id, id))
}

/* ------------------------------------------------------------------ verticals */

export async function createVertical(input: { name: string; reference1?: string; reference2?: string; target?: number }) {
  const db = await getDb()
  if (!input.name.trim()) throw new DomainError("name can't be empty.")
  const count = (await db.select({ id: verticals.id }).from(verticals)).length
  const [row] = await db
    .insert(verticals)
    .values({
      name: input.name.trim(),
      reference1: input.reference1?.trim() ?? "",
      reference2: input.reference2?.trim() ?? "",
      target: input.target ?? 20,
      hue: [75, 150, 330, 25, 260, 195, 110, 290][count % 8],
      sortOrder: count,
    })
    .returning()
  return row
}

export async function updateVertical(id: string, patch: Partial<{ name: string; hue: number; reference1: string; reference2: string; target: number }>) {
  const db = await getDb()
  const set: Record<string, unknown> = {}
  if (patch.name !== undefined) set.name = patch.name.trim()
  if (patch.hue !== undefined) set.hue = patch.hue
  if (patch.reference1 !== undefined) set.reference1 = patch.reference1.trim()
  if (patch.reference2 !== undefined) set.reference2 = patch.reference2.trim()
  if (patch.target !== undefined) set.target = patch.target
  if (Object.keys(set).length) await db.update(verticals).set(set).where(eq(verticals.id, id))
}

export async function deleteVertical(id: string) {
  const db = await getDb()
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(sites).where(eq(sites.verticalId, id))
  if (n) throw new DomainError(`It still has ${n} site${n > 1 ? "s" : ""}. Move or delete them first.`)
  await db.delete(verticals).where(eq(verticals.id, id))
}

/* ------------------------------------------------------------------ settings */

async function put(key: string, value: string) {
  const db = await getDb()
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } })
}

export type TemplatePatch = Partial<{ buildPrompt: string; sendSiteTemplate: string; callSchedulingTemplate: string; siteFollowUpDays: number; callAfterSiteDays: number }>

export async function saveTemplates(patch: TemplatePatch) {
  for (const k of TEMPLATE_KEYS) if (patch[k] !== undefined) await put(k, patch[k]!)
  for (const k of ["siteFollowUpDays", "callAfterSiteDays"] as const) {
    if (patch[k] !== undefined) {
      const n = Math.round(Number(patch[k]))
      if (!Number.isFinite(n) || n < 1 || n > 60) throw new DomainError(`${k} must be a whole number of days between 1 and 60.`)
      await put(k, String(n))
    }
  }
}

export async function resetTemplate(key: (typeof TEMPLATE_KEYS)[number]) {
  const db = await getDb()
  await db.delete(settings).where(eq(settings.key, key))
  return DEFAULT_TEMPLATES[key]
}

export async function markSync(note?: string, at?: string) {
  await put("lastSyncAt", String(toDate(at).getTime()))
  await put("lastSyncNote", note ?? "")
}

/* ------------------------------------------------------------------ everything */

export async function wipeAll() {
  const db = await getDb()
  await db.delete(extracts)
  await db.delete(lessons)
  await db.delete(tasks)
  await db.delete(messages)
  await db.delete(events)
  await db.delete(sites)
  await db.delete(verticals)
  await db.delete(settings)
}
