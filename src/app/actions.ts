"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getDb } from "@/db"
import { seed } from "@/db/seed"
import * as d from "@/lib/domain"
import { actionsFrom, isStage } from "@/lib/flow"
import { getWorld } from "@/lib/data"

const done = () => revalidatePath("/", "layout")

/** Wraps a mutation so the UI gets a message back instead of a crash. */
async function run<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    const value = await fn()
    done()
    return { ok: true, value }
  } catch (e) {
    if (e instanceof d.DomainError || e instanceof z.ZodError) return { ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid input" : e.message }
    throw e
  }
}

/* ------------------------------------------------------------------ flow */

/** Perform one of a stage's actions: what ticking a next step does. */
export async function applyAction(siteId: string, actionId: string, opts: { callAt?: string; dealValue?: number; reason?: string } = {}) {
  return run(async () => {
    const world = await getWorld()
    const site = world.sites.find((s) => s.id === siteId)
    if (!site) throw new d.DomainError("Site not found.", 404)
    const action = actionsFrom(site.stage).find((a) => a.id === actionId)
    if (!action) throw new d.DomainError("That step isn't available from here. Refresh and try again.")
    if (action.asks === "callAt" && !opts.callAt) throw new d.DomainError("Pick the date and time of the call.")
    await d.setStage(siteId, action.to, {
      callAt: opts.callAt ? d.toDate(opts.callAt) : undefined,
      dealValue: opts.dealValue ?? undefined,
      lostReason: opts.reason?.trim() ?? "",
    })
  })
}

export async function undoStep(siteId: string) {
  return run(() => d.undoStage(siteId))
}

export async function setStageDirect(siteId: string, stage: string) {
  return run(async () => {
    if (!isStage(stage)) throw new d.DomainError("Unknown stage.")
    await d.setStage(siteId, stage)
  })
}

/* ------------------------------------------------------------------ site fields and lessons */

const field = z.object({
  demoUrl: z.string().max(500),
  email: z.string().max(200),
  phone: z.string().max(60),
  contactName: z.string().max(120),
  city: z.string().max(80),
  oldSiteUrl: z.string().max(500),
  callNotes: z.string().max(4000),
  callAt: z.string().nullable(),
  build: z.enum(["todo", "building", "ready"]),
  questionVariant: z.string().max(300),
})

export async function updateSite(id: string, patch: Partial<z.input<typeof field>>) {
  return run(async () => {
    await d.updateSite(id, field.partial().parse(patch))
  })
}

export async function deleteSite(id: string) {
  return run(() => d.deleteSite(id))
}

export async function addLesson(siteId: string, body: string) {
  return run(() => d.addLesson(siteId, body))
}
export async function updateLesson(id: string, body: string) {
  return run(() => d.updateLesson(id, body))
}
export async function deleteLesson(id: string) {
  return run(() => d.deleteLesson(id))
}

/* ------------------------------------------------------------------ tasks */

export async function addTask(input: { title: string; siteId?: string | null; dueAt?: string | null }) {
  return run(() => d.addTask({ ...input, source: "manual" }))
}
export async function tickTask(id: string, doneNow: boolean) {
  return run(() => d.setTaskDone(id, doneNow))
}
export async function deleteTask(id: string) {
  return run(() => d.deleteTask(id))
}

/* ------------------------------------------------------------------ verticals */

export async function createVertical(name: string) {
  return run(() => d.createVertical({ name }))
}
export async function updateVertical(id: string, patch: Partial<{ name: string; hue: number; reference1: string; reference2: string; target: number }>) {
  return run(() => d.updateVertical(id, patch))
}
export async function deleteVertical(id: string) {
  return run(() => d.deleteVertical(id))
}

/* ------------------------------------------------------------------ templates */

export async function saveTemplates(patch: d.TemplatePatch) {
  return run(() => d.saveTemplates(patch))
}
export async function resetTemplate(key: "buildPrompt" | "sendSiteTemplate" | "callSchedulingTemplate") {
  return run(() => d.resetTemplate(key))
}

/* ------------------------------------------------------------------ data */

export async function loadDemoData() {
  return run(async () => {
    await d.wipeAll()
    await seed(await getDb())
  })
}
export async function clearAllData() {
  return run(() => d.wipeAll())
}
