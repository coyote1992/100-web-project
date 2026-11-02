import "server-only"
import { cache } from "react"
import { connection } from "next/server"
import { asc, desc } from "drizzle-orm"
import { getDb, schema } from "@/db"
import type { World } from "./metrics"
import { DEFAULT_TEMPLATES, type Templates } from "./templates"

/**
 * Everything the app shows, narrowed to the one vertical it focuses on (tennis).
 * Sites in other verticals stay in the database untouched; they just aren't shown or offered to ChatGPT.
 */
export const getWorld = cache(async function getWorld(): Promise<World> {
  await connection()
  return focusOn(await read())
})

/** Every row, all verticals included. For backups. */
export async function getEverything(): Promise<World> {
  await connection()
  return read()
}

/** The tennis vertical: the first whose name mentions tennis (or tenisz/padel), else the first one. */
export function focusVertical<T extends { name: string }>(verticals: T[]): T | undefined {
  return verticals.find((v) => /tenni|tenisz|padel/i.test(v.name)) ?? verticals[0]
}

function focusOn(w: World): World {
  const focus = focusVertical(w.verticals)
  if (!focus) return w
  const sites = w.sites.filter((s) => s.verticalId === focus.id)
  const ids = new Set(sites.map((s) => s.id))
  const keep = <T extends { siteId: string | null }>(xs: T[]) => xs.filter((x) => !x.siteId || ids.has(x.siteId))
  return {
    ...w,
    verticals: [focus],
    sites,
    events: keep(w.events),
    messages: keep(w.messages),
    extracts: keep(w.extracts),
    lessons: keep(w.lessons),
    tasks: keep(w.tasks),
  }
}

async function read(): Promise<World> {
  const db = await getDb()
  const verticals = await db.select().from(schema.verticals).orderBy(asc(schema.verticals.sortOrder), asc(schema.verticals.createdAt))
  const sites = await db.select().from(schema.sites).orderBy(desc(schema.sites.updatedAt))
  const events = await db.select().from(schema.events).orderBy(asc(schema.events.at))
  const messages = await db.select().from(schema.messages).orderBy(asc(schema.messages.at))
  const extracts = await db.select().from(schema.extracts).orderBy(desc(schema.extracts.createdAt))
  const lessons = await db.select().from(schema.lessons).orderBy(desc(schema.lessons.createdAt))
  const tasks = await db.select().from(schema.tasks).orderBy(asc(schema.tasks.createdAt))
  const settings = await db.select().from(schema.settings)
  const map = new Map(settings.map((s) => [s.key, s.value]))
  const num = (k: string, d: number) => {
    const n = Number(map.get(k))
    return Number.isFinite(n) && n > 0 ? n : d
  }
  const templates: Templates = {
    buildPrompt: map.get("buildPrompt") ?? DEFAULT_TEMPLATES.buildPrompt,
    sendSiteTemplate: map.get("sendSiteTemplate") ?? DEFAULT_TEMPLATES.sendSiteTemplate,
    callSchedulingTemplate: map.get("callSchedulingTemplate") ?? DEFAULT_TEMPLATES.callSchedulingTemplate,
    siteFollowUpDays: num("siteFollowUpDays", DEFAULT_TEMPLATES.siteFollowUpDays),
    callAfterSiteDays: num("callAfterSiteDays", DEFAULT_TEMPLATES.callAfterSiteDays),
  }
  const last = Number(map.get("lastSyncAt"))
  return {
    verticals,
    sites,
    events,
    messages,
    extracts,
    lessons,
    tasks,
    templates,
    customised: {
      buildPrompt: map.has("buildPrompt"),
      sendSiteTemplate: map.has("sendSiteTemplate"),
      callSchedulingTemplate: map.has("callSchedulingTemplate"),
    },
    lastSyncAt: Number.isFinite(last) && last > 0 ? new Date(last) : null,
    lastSyncNote: map.get("lastSyncNote") ?? "",
  }
}
