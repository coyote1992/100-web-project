"use server"

import { revalidatePath } from "next/cache"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"
import { z } from "zod"
import { db, ready, schema } from "@/db"
import { transitionsFrom, type NodeKey } from "@/lib/flow"
import { seed } from "@/db/seed"

const { prospects, events, workLogs, notes, verticals, batches, messages } = schema

function done() {
  revalidatePath("/", "layout")
}

const touch = (id: string) => db.update(prospects).set({ updatedAt: new Date() }).where(eq(prospects.id, id))

/* ------------------------------------------------------------------ prospects */

const prospectInput = z.object({
  name: z.string().trim().max(120).default(""),
  verticalId: z.string().min(1, "Pick a vertical"),
  batchId: z.string().nullable().optional(),
  city: z.string().trim().max(80).optional(),
  oldSiteUrl: z.string().trim().max(500).optional(),
  demoUrl: z.string().trim().max(500).optional(),
  references: z.string().trim().max(2000).optional(),
  contactName: z.string().trim().max(120).optional(),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(60).optional(),
  build: z.enum(["scouted", "building", "ready"]).optional(),
  buildMethod: z.string().trim().max(120).optional(),
})

export type ProspectInput = z.input<typeof prospectInput>

/** "https://www.next-tenisz.hu/" → "Next Tenisz" */
function nameFromUrl(url: string) {
  try {
    const host = new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "")
    const base = host.split(".").slice(0, -1).join(" ") || host
    return base
      .split(/[-_. ]+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ")
  } catch {
    return ""
  }
}

export async function createProspect(input: ProspectInput) {
  await ready()
  const data = prospectInput.parse(input)
  const name = data.name || nameFromUrl(data.oldSiteUrl ?? "")
  if (!name) return { error: "Give it a name or paste the current site URL." }
  const [row] = await db
    .insert(prospects)
    .values({ ...data, name, batchId: data.batchId || null })
    .returning({ id: prospects.id })
  done()
  return { id: row.id }
}

export async function updateProspect(id: string, input: Partial<ProspectInput> & { dealValue?: number | null }) {
  await ready()
  const data = prospectInput.partial().extend({ dealValue: z.number().int().nullable().optional() }).parse(input)
  await db
    .update(prospects)
    .set({ ...data, batchId: data.batchId === undefined ? undefined : data.batchId || null, updatedAt: new Date() })
    .where(eq(prospects.id, id))
  done()
}

export async function deleteProspect(id: string) {
  await ready()
  await db.delete(events).where(eq(events.prospectId, id))
  await db.delete(workLogs).where(eq(workLogs.prospectId, id))
  await db.delete(notes).where(eq(notes.prospectId, id))
  await db.update(messages).set({ prospectId: null }).where(eq(messages.prospectId, id))
  await db.delete(prospects).where(eq(prospects.id, id))
  done()
}

export async function setParked(id: string, parked: boolean) {
  await ready()
  await db.update(prospects).set({ parked, updatedAt: new Date() }).where(eq(prospects.id, id))
  done()
}

/* ------------------------------------------------------------------ flow */

const stepInput = z.object({
  at: z.number().optional(),
  note: z.string().trim().max(4000).optional(),
  sentiment: z.number().int().min(-1).max(1).nullable().optional(),
  minutes: z.number().int().min(0).max(600).nullable().optional(),
  dealValue: z.number().int().min(0).nullable().optional(),
})

export async function recordStep(prospectId: string, transitionId: string, input: z.input<typeof stepInput> = {}) {
  await ready()
  const opts = stepInput.parse(input)
  const p = await db.query.prospects.findFirst({ where: eq(prospects.id, prospectId) })
  if (!p) return { error: "Site not found." }
  const t = transitionsFrom(p.stage as NodeKey | null).find((x) => x.id === transitionId)
  if (!t) return { error: "That step isn't available from here — refresh and try again." }

  const at = opts.at ?? Date.now()
  await db.insert(events).values(
    t.path.map((node, i) => ({
      prospectId,
      node,
      at: new Date(at + i), // keep order stable when one click records two nodes
      note: i === t.path.length - 1 ? (opts.note ?? "") : "",
      sentiment: i === t.path.length - 1 ? (opts.sentiment ?? null) : null,
      minutes: node === "call" || node === "call_proposal" ? (opts.minutes ?? null) : null,
    })),
  )
  if (opts.minutes && t.asks === "call") {
    await db.insert(workLogs).values({
      prospectId,
      kind: "sales",
      minutes: opts.minutes,
      startedAt: new Date(at - opts.minutes * 60_000),
      endedAt: new Date(at),
      note: "Call",
    })
  }
  await db
    .update(prospects)
    .set({
      stage: t.path.at(-1),
      updatedAt: new Date(),
      ...(opts.dealValue != null ? { dealValue: opts.dealValue } : {}),
      ...(p.build === "scouted" && t.path.includes("site_sent") ? { build: "ready" as const } : {}),
    })
    .where(eq(prospects.id, prospectId))
  done()
  return { ok: true as const }
}

/** Removes the most recent flow step (and its twin if one click wrote two). */
export async function undoStep(prospectId: string) {
  await ready()
  const recent = await db.select().from(events).where(eq(events.prospectId, prospectId)).orderBy(desc(events.at)).limit(3)
  if (!recent.length) return
  const last = recent[0]
  const twins = recent.filter((e) => last.at.getTime() - e.at.getTime() < 5 && e.createdAt.getTime() === last.createdAt.getTime())
  await db.delete(events).where(inArray(events.id, twins.map((e) => e.id)))
  const [prev] = await db.select().from(events).where(eq(events.prospectId, prospectId)).orderBy(desc(events.at)).limit(1)
  await db.update(prospects).set({ stage: prev?.node ?? null, updatedAt: new Date() }).where(eq(prospects.id, prospectId))
  done()
}

/* ------------------------------------------------------------------ time */

const kinds = z.enum(["research", "build", "qa", "outreach", "sales", "admin"])

export async function logWork(input: { prospectId: string | null; kind: string; minutes: number; note?: string; at?: number }) {
  await ready()
  const kind = kinds.parse(input.kind)
  const minutes = z.number().int().min(1).max(24 * 60).parse(input.minutes)
  const end = input.at ?? Date.now()
  await db.insert(workLogs).values({
    prospectId: input.prospectId,
    kind,
    minutes,
    startedAt: new Date(end - minutes * 60_000),
    endedAt: new Date(end),
    note: input.note ?? "",
  })
  if (input.prospectId) {
    if (kind === "build") {
      await db
        .update(prospects)
        .set({ build: "building" })
        .where(and(eq(prospects.id, input.prospectId), eq(prospects.build, "scouted")))
    }
    await touch(input.prospectId)
  }
  done()
}

async function closeRunning() {
  const running = await db.select().from(workLogs).where(isNull(workLogs.endedAt))
  const now = Date.now()
  for (const r of running) {
    const minutes = r.minutes + Math.max(1, Math.round((now - r.startedAt.getTime()) / 60_000))
    await db.update(workLogs).set({ endedAt: new Date(now), minutes }).where(eq(workLogs.id, r.id))
  }
}

export async function startTimer(prospectId: string | null, kind: string) {
  await ready()
  await closeRunning()
  await db.insert(workLogs).values({ prospectId, kind: kinds.parse(kind), minutes: 0, startedAt: new Date() })
  if (prospectId && kind === "build") {
    await db.update(prospects).set({ build: "building" }).where(and(eq(prospects.id, prospectId), eq(prospects.build, "scouted")))
  }
  done()
}

export async function stopTimer() {
  await ready()
  await closeRunning()
  done()
}

export async function deleteWorkLog(id: string) {
  await ready()
  await db.delete(workLogs).where(eq(workLogs.id, id))
  done()
}

/* ------------------------------------------------------------------ notes */

export async function addNote(input: { prospectId?: string | null; verticalId?: string | null; body: string; isLesson?: boolean }) {
  await ready()
  const body = z.string().trim().min(1).max(8000).parse(input.body)
  let verticalId = input.verticalId ?? null
  if (!verticalId && input.prospectId) {
    const p = await db.query.prospects.findFirst({ where: eq(prospects.id, input.prospectId) })
    verticalId = p?.verticalId ?? null
  }
  await db.insert(notes).values({ prospectId: input.prospectId ?? null, verticalId, body, isLesson: !!input.isLesson })
  if (input.prospectId) await touch(input.prospectId)
  done()
}

export async function toggleLesson(id: string, isLesson: boolean) {
  await ready()
  await db.update(notes).set({ isLesson }).where(eq(notes.id, id))
  done()
}

export async function deleteNote(id: string) {
  await ready()
  await db.delete(notes).where(eq(notes.id, id))
  done()
}

/* ------------------------------------------------------------------ verticals */

const verticalInput = z.object({
  name: z.string().trim().min(1).max(60),
  hue: z.number().int().min(0).max(360).optional(),
  playbook: z.string().max(20000).optional(),
  target: z.number().int().min(1).max(500).optional(),
})

export async function createVertical(input: z.input<typeof verticalInput>) {
  await ready()
  const data = verticalInput.parse(input)
  const count = (await db.select({ id: verticals.id }).from(verticals)).length
  const [row] = await db
    .insert(verticals)
    .values({ ...data, hue: data.hue ?? [80, 150, 25, 250, 320, 195][count % 6], sortOrder: count })
    .returning({ id: verticals.id })
  done()
  return { id: row.id }
}

export async function updateVertical(id: string, input: Partial<z.input<typeof verticalInput>>) {
  await ready()
  await db.update(verticals).set(verticalInput.partial().parse(input)).where(eq(verticals.id, id))
  done()
}

export async function deleteVertical(id: string) {
  await ready()
  const ps = await db.select({ id: prospects.id }).from(prospects).where(eq(prospects.verticalId, id))
  if (ps.length) return { error: `Move or delete its ${ps.length} site${ps.length > 1 ? "s" : ""} first.` }
  await db.update(notes).set({ verticalId: null }).where(eq(notes.verticalId, id))
  await db.delete(verticals).where(eq(verticals.id, id))
  done()
  return { ok: true as const }
}

/* ------------------------------------------------------------------ batches */

export async function createBatch(input: { name: string; notes?: string; prospectIds?: string[] }) {
  await ready()
  const name = z.string().trim().min(1).max(80).parse(input.name)
  const [row] = await db.insert(batches).values({ name, notes: input.notes ?? "" }).returning({ id: batches.id })
  if (input.prospectIds?.length) {
    await db.update(prospects).set({ batchId: row.id }).where(inArray(prospects.id, input.prospectIds))
  }
  done()
  return { id: row.id }
}

export async function updateBatch(id: string, input: { name?: string; notes?: string }) {
  await ready()
  await db.update(batches).set(input).where(eq(batches.id, id))
  done()
}

export async function assignBatch(prospectIds: string[], batchId: string | null) {
  await ready()
  if (!prospectIds.length) return
  await db.update(prospects).set({ batchId }).where(inArray(prospects.id, prospectIds))
  done()
}

export async function deleteBatch(id: string) {
  await ready()
  await db.update(prospects).set({ batchId: null }).where(eq(prospects.batchId, id))
  await db.delete(batches).where(eq(batches.id, id))
  done()
}

/* ------------------------------------------------------------------ messages */

export async function logMessage(input: {
  prospectId: string | null
  direction: "in" | "out"
  subject?: string
  body?: string
  at?: number
}) {
  await ready()
  await db.insert(messages).values({
    prospectId: input.prospectId,
    direction: input.direction,
    subject: input.subject ?? "",
    body: input.body ?? "",
    at: new Date(input.at ?? Date.now()),
    source: "manual",
  })
  if (input.prospectId) await touch(input.prospectId)
  done()
}

export async function rateMessage(id: string, rating: -1 | 0 | 1 | null) {
  await ready()
  await db.update(messages).set({ rating }).where(eq(messages.id, id))
  done()
}

export async function assignMessage(id: string, prospectId: string | null) {
  await ready()
  await db.update(messages).set({ prospectId }).where(eq(messages.id, id))
  done()
}

/* ------------------------------------------------------------------ data */

export async function loadDemoData() {
  await ready()
  await wipe()
  await seed(db)
  done()
}

export async function clearAllData() {
  await ready()
  await wipe()
  done()
}

async function wipe() {
  await db.delete(events)
  await db.delete(workLogs)
  await db.delete(notes)
  await db.delete(messages)
  await db.delete(prospects)
  await db.delete(batches)
  await db.delete(verticals)
}

/* ------------------------------------------------------------------ settings */

export async function saveSetting(key: "prompt" | "chaseDays", value: string) {
  await ready()
  await db
    .insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
  done()
}
