import "server-only"
import path from "node:path"
import { mkdirSync } from "node:fs"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { migrate } from "drizzle-orm/libsql/migrator"
import * as schema from "./schema"

import { dbAuthToken, dbUrl as url } from "./config"

if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice(5)), { recursive: true })

const g = globalThis as unknown as {
  client?: ReturnType<typeof createClient>
  migrated?: Promise<void>
}

const client = g.client ?? createClient({ url, authToken: dbAuthToken })
g.client = client

export const db = drizzle(client, { schema })
export { schema }

/** Applies pending migrations once per server process. */
export function ready() {
  g.migrated ??= client
    .execute("PRAGMA foreign_keys = ON")
    .then(() => migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") }))
  return g.migrated
}
