import { sql } from "drizzle-orm"
import { dbHost, dbKind } from "@/db/config"
import { getDb, schema } from "@/db"

export const maxDuration = 60

const mask = (s: string) => s.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_secret_\w+/g, "***")

async function step<T>(name: string, ms: number, fn: () => Promise<T>) {
  const t = Date.now()
  try {
    const value = await Promise.race([fn(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`no answer after ${ms / 1000}s`)), ms))])
    return { step: name, ok: true, ms: Date.now() - t, value }
  } catch (e) {
    return { step: name, ok: false, ms: Date.now() - t, error: mask(e instanceof Error ? e.message : String(e)) }
  }
}

/** Where is it stuck? Answers within ~40s, never hangs. Protected by the app password like everything else. */
export async function GET() {
  const steps: unknown[] = [
    {
      step: "environment",
      ok: true,
      value: {
        database: dbKind,
        host: dbHost(),
        hasAppPassword: !!process.env.APP_PASSWORD,
        hasApiToken: !!process.env.API_TOKEN,
        vercel: !!process.env.VERCEL,
        region: process.env.VERCEL_REGION ?? null,
      },
    },
  ]
  const connect = await step("1. connect", 15_000, async () => void (await getDb()))
  steps.push(connect)
  if (connect.ok) {
    const db = await getDb()
    steps.push(await step("2. run SELECT 1", 10_000, async () => (await db.execute(sql`select 1 as ok`)) && "ok"))
    const tables = { verticals: schema.verticals, sites: schema.sites, events: schema.events, messages: schema.messages, extracts: schema.extracts, lessons: schema.lessons, tasks: schema.tasks, settings: schema.settings }
    for (const [name, t] of Object.entries(tables)) steps.push(await step(`3. read table ${name}`, 10_000, async () => (await db.select().from(t)).length))
    steps.push(
      await step("4. load everything a page needs", 20_000, async () => {
        const { getWorld } = await import("@/lib/data")
        const w = await getWorld()
        return { verticals: w.verticals.length, sites: w.sites.length }
      }),
    )
  }
  return Response.json({ ok: steps.every((s) => (s as { ok: boolean }).ok), steps }, { headers: { "cache-control": "no-store" } })
}
