/**
 * npm run db:seed: wipes the connected database and loads the demo data.
 * Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY when set, otherwise the local ./data/pglite database.
 */
import { getDb } from "../src/db"
import { seed } from "../src/db/seed"
import * as schema from "../src/db/schema"

async function main() {
  const db = await getDb()
  for (const t of [schema.extracts, schema.lessons, schema.tasks, schema.messages, schema.events, schema.sites, schema.verticals, schema.settings]) await db.delete(t)
  await seed(db)
  console.log("Seeded demo data.")
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
