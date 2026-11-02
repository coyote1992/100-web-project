import path from "node:path"
import type { PgRemoteDatabase } from "drizzle-orm/pg-proxy"
import * as schema from "./schema"
import { dbKind, pgliteDir, supabaseKey, supabaseUrl } from "./config"

export type DB = PgRemoteDatabase<typeof schema>

const g = globalThis as unknown as { hundredDb?: Promise<DB> }

export class DbError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message)
  }
}

const TIMEOUT_MS = 8000

/**
 * Runs one SQL statement through Supabase's REST API (the hundred_exec function), so the app never holds a
 * database connection: nothing to pool, freeze or run out of. Reads are retried once on network trouble.
 */
async function remote(sql: string, params: unknown[], method: "all" | "execute") {
  const isRead = /^\s*select\b/i.test(sql)
  const headers: Record<string, string> = { "content-type": "application/json", apikey: supabaseKey }
  // Legacy keys are JWTs and also go in Authorization; the newer sb_secret_ keys must not.
  if (supabaseKey.startsWith("eyJ")) headers.authorization = `Bearer ${supabaseKey}`

  for (let attempt = 0; ; attempt++) {
    let res: Response
    try {
      res = await fetch(`${supabaseUrl}/rest/v1/rpc/hundred_exec`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: sql, params }),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (e) {
      if (isRead && attempt === 0) continue
      const why = e instanceof Error ? e.message : String(e)
      throw new DbError(`Could not reach Supabase at ${supabaseUrl} (${why})`)
    }
    if (isRead && attempt === 0 && res.status >= 500) continue
    const text = await res.text()
    let body: unknown
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = null
    }
    if (!res.ok) {
      const b = (body ?? {}) as { message?: string; code?: string; hint?: string }
      const base = b.message ?? `Supabase answered ${res.status}`
      throw new DbError(b.hint ? `${base} (${b.hint})` : base, b.code)
    }
    const rows = (Array.isArray(body) ? body : []) as Record<string, unknown>[]
    // json_agg keeps column order, which is what drizzle's array mode needs.
    return { rows: method === "all" ? rows.map((r) => Object.values(r)) : rows }
  }
}

/**
 * Columns added after the first setup. A Supabase database gets them on the first request after a deploy,
 * so nobody has to paste SQL again. Fresh databases get them from supabase/setup.sql.
 */
const UPGRADES: { column: string; sql: string }[] = [
  { column: "call_status", sql: `ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "call_status" text DEFAULT 'none' NOT NULL` },
  { column: "seen_at", sql: `ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "seen_at" timestamp with time zone` },
  { column: "phone_owner", sql: `ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "phone_owner" text DEFAULT 'unknown' NOT NULL` },
  { column: "contact_role", sql: `ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "contact_role" text DEFAULT 'unknown' NOT NULL` },
]

async function upgrade() {
  const { rows } = await remote(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'sites'`,
    [],
    "all",
  )
  const have = new Set((rows as unknown[][]).map((r) => String(r[0])))
  if (!have.size) return // no tables yet: the setup screen takes it from here
  for (const u of UPGRADES) if (!have.has(u.column)) await remote(u.sql, [], "execute")
}

async function connect(): Promise<DB> {
  if (dbKind === "supabase") {
    const { drizzle } = await import("drizzle-orm/pg-proxy")
    await upgrade()
    return drizzle(remote as never, { schema })
  }
  const { mkdirSync } = await import("node:fs")
  mkdirSync(path.dirname(pgliteDir), { recursive: true })
  const { PGlite } = await import("@electric-sql/pglite")
  const { drizzle } = await import("drizzle-orm/pglite")
  const { migrate } = await import("drizzle-orm/pglite/migrator")
  const db = drizzle(new PGlite(pgliteDir), { schema })
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") })
  return db as unknown as DB
}

/** The database, ready to use. On Supabase the tables come from supabase/setup.sql, pasted in once. */
export function getDb() {
  g.hundredDb ??= connect().catch((e) => {
    g.hundredDb = undefined
    throw e
  })
  return g.hundredDb
}

export { schema }
