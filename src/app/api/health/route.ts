import { dbHost, dbKind, databaseUrl } from "@/db/config"
import { getDb } from "@/db"

export const maxDuration = 60

const mask = (s: string) => s.replace(/:\/\/[^@\s]*@/g, "://***@")

async function step<T>(name: string, ms: number, fn: () => Promise<T>) {
  const t = Date.now()
  try {
    const value = await Promise.race([fn(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`no answer after ${ms / 1000}s`)), ms))])
    return { step: name, ok: true, ms: Date.now() - t, value }
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}${e.cause instanceof Error ? ` (${e.cause.message})` : ""}` : String(e)
    return { step: name, ok: false, ms: Date.now() - t, error: mask(msg) }
  }
}

/** Where is it stuck? Answers within ~35s, never hangs. Protected by the app password like everything else. */
export async function GET() {
  const steps = []
  steps.push({ step: "environment", ok: true, value: { database: dbKind, host: dbHost(), hasDatabaseUrl: !!databaseUrl, hasAppPassword: !!process.env.APP_PASSWORD, hasApiToken: !!process.env.API_TOKEN, vercel: !!process.env.VERCEL, region: process.env.VERCEL_REGION ?? null } })
  const url = databaseUrl
  if (url) {
    steps.push(
      await step("1. open a connection and run SELECT 1", 10_000, async () => {
        const { default: postgres } = await import("postgres")
        const sql = postgres(url, { prepare: false, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require", max: 1, connect_timeout: 8 })
        try {
          const r = await sql`select 1 as ok`
          return r[0]
        } finally {
          sql.end({ timeout: 1 }).catch(() => {})
        }
      }),
    )
  }
  steps.push(await step("2. connect and create/update the tables", 20_000, async () => void (await getDb())))
  if (steps.at(-1)?.ok) {
    const db = await getDb()
    const { sql: q } = await import("drizzle-orm")
    for (const t of ["verticals", "sites", "events", "messages", "extracts", "lessons", "tasks", "settings"]) {
      steps.push(await step(`3. read table ${t}`, 8_000, async () => (await db.execute(q.raw(`select count(*)::int as n from "${t}"`)))))
    }
    steps.push(await step("4. read all tables at once (what a page does)", 15_000, async () => {
      const { getWorld } = await import("@/lib/data")
      const w = await getWorld()
      return { verticals: w.verticals.length, sites: w.sites.length }
    }))
  }
  return Response.json({ ok: steps.every((s) => s.ok), steps }, { headers: { "cache-control": "no-store" } })
}
