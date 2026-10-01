import path from "node:path"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import * as schema from "./schema"
import { databaseUrl, pgliteDir } from "./config"

export type DB = PostgresJsDatabase<typeof schema>

const g = globalThis as unknown as { hundredDb?: Promise<DB>; hundredEnd?: () => Promise<void> }

async function connect(): Promise<DB> {
  const migrationsFolder = path.join(process.cwd(), "drizzle")
  if (databaseUrl) {
    const { default: postgres } = await import("postgres")
    const { drizzle } = await import("drizzle-orm/postgres-js")
    const { migrate } = await import("drizzle-orm/postgres-js/migrator")
    const local = /localhost|127\.0\.0\.1/.test(databaseUrl)
    // prepare:false keeps Supabase's transaction pooler happy.
    const client = postgres(databaseUrl, { prepare: false, ssl: local ? false : "require", max: process.env.VERCEL ? 1 : 5, idle_timeout: 5, max_lifetime: 120, connect_timeout: 10 })
    g.hundredEnd = () => client.end({ timeout: 1 }).catch(() => {})
    const db = drizzle(client, { schema })
    await migrate(db, { migrationsFolder })
    return db
  }
  const { mkdirSync } = await import("node:fs")
  mkdirSync(path.dirname(pgliteDir), { recursive: true })
  const { PGlite } = await import("@electric-sql/pglite")
  const { drizzle } = await import("drizzle-orm/pglite")
  const { migrate } = await import("drizzle-orm/pglite/migrator")
  const client = new PGlite(pgliteDir)
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder })
  return db as unknown as DB
}

/** Connected, migrated database. One connection per server process. */
export function getDb() {
  g.hundredDb ??= connect().catch((e) => {
    g.hundredDb = undefined
    throw e
  })
  return g.hundredDb
}

export { schema }

/** Drop the cached connection so the next getDb() opens a fresh one (used when a query stops answering). */
export async function resetDb() {
  const end = g.hundredEnd
  g.hundredDb = undefined
  g.hundredEnd = undefined
  if (end) await end()
}
