import "server-only"
import { cache } from "react"
import { connection } from "next/server"
import { db, ready, schema } from "@/db"
import { asc, desc } from "drizzle-orm"
import type { World } from "./metrics"
import { DEFAULT_PROMPT } from "./prompt"

export const getWorld = cache(async function getWorld(): Promise<World> {
  await connection()
  await ready()
  const [verticals, batches, prospects, events, workLogs, notes, messages] = await Promise.all([
    db.select().from(schema.verticals).orderBy(asc(schema.verticals.sortOrder), asc(schema.verticals.createdAt)),
    db.select().from(schema.batches).orderBy(asc(schema.batches.createdAt)),
    db.select().from(schema.prospects).orderBy(desc(schema.prospects.updatedAt)),
    db.select().from(schema.events).orderBy(asc(schema.events.at)),
    db.select().from(schema.workLogs).orderBy(desc(schema.workLogs.startedAt)),
    db.select().from(schema.notes).orderBy(desc(schema.notes.createdAt)),
    db.select().from(schema.messages).orderBy(desc(schema.messages.at)),
  ])
  return { verticals, batches, prospects, events, workLogs, notes, messages }
})

export const getSettings = cache(async function getSettings() {
  await connection()
  await ready()
  const rows = await db.select().from(schema.settings)
  const map = new Map(rows.map((r) => [r.key, r.value]))
  return {
    prompt: map.get("prompt") ?? DEFAULT_PROMPT,
    promptCustomised: map.has("prompt"),
    chaseDays: Number(map.get("chaseDays") ?? 4),
  }
})
