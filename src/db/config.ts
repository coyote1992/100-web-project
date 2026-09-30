/**
 * Where the database lives.
 * - DATABASE_URL / DATABASE_AUTH_TOKEN, or the TURSO_* pair the Vercel × Turso integration sets.
 * - On Vercel with neither: /tmp, which is wiped whenever the function restarts (the UI warns).
 * - Locally: ./data/hundred.db
 */
export const dbUrl =
  process.env.DATABASE_URL ??
  process.env.TURSO_DATABASE_URL ??
  (process.env.VERCEL ? "file:/tmp/hundred.db" : "file:./data/hundred.db")

export const dbAuthToken = process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN

/** True when data won't survive a restart (Vercel without a hosted database). */
export const dbIsEphemeral = dbUrl.startsWith("file:/tmp/")
