/**
 * Where the database lives.
 * - DATABASE_URL (or POSTGRES_URL from Vercel's Supabase integration): a Supabase / Postgres connection string.
 * - Otherwise a local Postgres-in-a-folder (PGlite): ./data/pglite in development, /tmp on Vercel.
 *   On Vercel that folder is wiped when the function restarts, so the UI warns.
 */
function clean(raw: string | undefined) {
  if (!raw) return null
  try {
    const u = new URL(raw)
    // The Vercel × Supabase integration appends a `supa=` flag that Postgres rejects.
    u.searchParams.delete("supa")
    return u.toString()
  } catch {
    return raw
  }
}

export const databaseUrl = clean(process.env.DATABASE_URL ?? process.env.POSTGRES_URL)
export const pgliteDir = process.env.VERCEL ? "/tmp/hundred-pglite" : "./data/pglite"
export const dbKind: "postgres" | "local" | "temporary" = databaseUrl ? "postgres" : process.env.VERCEL ? "temporary" : "local"

export function dbHost() {
  if (!databaseUrl) return dbKind === "temporary" ? "temporary storage" : "local file"
  try {
    return new URL(databaseUrl).hostname
  } catch {
    return "database"
  }
}
