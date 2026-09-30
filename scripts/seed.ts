/**
 * npm run db:seed — wipes the local database and loads the demo data.
 */
import path from "node:path"
import { mkdirSync } from "node:fs"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { migrate } from "drizzle-orm/libsql/migrator"
import * as schema from "../src/db/schema"
import { seed } from "../src/db/seed"

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./data/hundred.db"
  if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice(5)), { recursive: true })
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN })
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") })
  for (const t of [schema.events, schema.workLogs, schema.notes, schema.messages, schema.prospects, schema.batches, schema.verticals]) {
    await db.delete(t)
  }
  await seed(db)
  console.log("Seeded demo data into", url)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
