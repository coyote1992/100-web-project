import path from "node:path"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import * as schema from "./schema"
import { databaseUrl, pgliteDir } from "./config"

export type DB = PostgresJsDatabase<typeof schema>

const g = globalThis as unknown as { hundredDb?: Promise<DB> }

async function connect(): Promise<DB> {
  const migrationsFolder = path.join(process.cwd(), "drizzle")
  if (databaseUrl) {
    const { default: postgres } = await import("postgres")
    const { drizzle } = await import("drizzle-orm/postgres-js")
    const { migrate } = await import("drizzle-orm/postgres-js/migrator")
    const local = /localhost|127\.0\.0\.1/.test(databaseUrl)
    // prepare:false keeps Supabase's transaction pooler happy.
    const client = postgres(databaseUrl, { prepare: false, ssl: local ? false : "require", max: process.env.VERCEL ? 1 : 5, idle_timeout: 20, connect_timeout: 10 })
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
