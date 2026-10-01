/**
 * Where the data lives.
 * - Supabase over HTTPS: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or the newer SUPABASE_SECRET_KEY).
 *   NEXT_PUBLIC_SUPABASE_URL works as the URL too.
 * - Otherwise a local Postgres-in-a-folder (PGlite): ./data/pglite in development, /tmp on Vercel.
 *   On Vercel that folder is wiped when the function restarts, so the UI warns.
 */
const trim = (s: string | undefined) => (s ?? "").trim().replace(/\/+$/, "")

export const supabaseUrl = trim(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)
export const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "").trim()
export const pgliteDir = process.env.VERCEL ? "/tmp/hundred-pglite" : "./data/pglite"

export const dbKind: "supabase" | "local" | "temporary" = supabaseUrl && supabaseKey ? "supabase" : process.env.VERCEL ? "temporary" : "local"

export function dbHost() {
  if (dbKind === "supabase") {
    try {
      return new URL(supabaseUrl).hostname
    } catch {
      return supabaseUrl
    }
  }
  return dbKind === "temporary" ? "temporary storage" : "local file"
}
