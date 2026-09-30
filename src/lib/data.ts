import "server-only"
import { cache } from "react"
import { connection } from "next/server"
import { asc, desc } from "drizzle-orm"
import { getDb, schema } from "@/db"
import type { World } from "./metrics"
import { DEFAULT_TEMPLATES, type Templates } from "./templates"

export const getWorld = cache(async function getWorld(): Promise<World> {
  await connection()
  const db = await getDb()
  const [verticals, sites, events, messages, extracts, lessons, tasks, settings] = await Promise.all([
    db.select().from(schema.verticals).orderBy(asc(schema.verticals.sortOrder), asc(schema.verticals.createdAt)),
    db.select().from(schema.sites).orderBy(desc(schema.sites.updatedAt)),
    db.select().from(schema.events).orderBy(asc(schema.events.at)),
    db.select().from(schema.messages).orderBy(asc(schema.messages.at)),
    db.select().from(schema.extracts).orderBy(desc(schema.extracts.createdAt)),
    db.select().from(schema.lessons).orderBy(desc(schema.lessons.createdAt)),
    db.select().from(schema.tasks).orderBy(asc(schema.tasks.createdAt)),
    db.select().from(schema.settings),
  ])
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
})
