import "server-only"
import { supabaseKey, supabaseUrl, dbKind } from "@/db/config"

/**
 * Site packages (zip files) live in a private Supabase Storage bucket, reached over HTTPS with the
 * same service key as the database. Browsers and shells upload straight to Supabase with a signed
 * URL, so the zip never passes through a Vercel function (which caps request bodies at 4.5 MB).
 */

const BUCKET = "site-packages"
export const MAX_PACKAGE_MB = 50

export class StorageError extends Error {}

function ready() {
  if (dbKind !== "supabase") throw new StorageError("Uploading packages needs Supabase storage. Connect Supabase first (Settings → Database).")
}

async function call(path: string, init: RequestInit & { json?: unknown } = {}) {
  ready()
  const headers: Record<string, string> = { apikey: supabaseKey }
  if (supabaseKey.startsWith("eyJ")) headers.authorization = `Bearer ${supabaseKey}`
  let body = init.body
  if (init.json !== undefined) {
    headers["content-type"] = "application/json"
    body = JSON.stringify(init.json)
  }
  const res = await fetch(`${supabaseUrl}/storage/v1${path}`, { ...init, body, headers: { ...headers, ...(init.headers as Record<string, string>) }, signal: AbortSignal.timeout(15_000) })
  return res
}

let bucketReady = false
async function ensureBucket() {
  if (bucketReady) return
  const res = await call("/bucket", { method: "POST", json: { id: BUCKET, name: BUCKET, public: false, file_size_limit: MAX_PACKAGE_MB * 1024 * 1024 } })
  if (!res.ok) {
    const text = await res.text()
    if (!/already exists|Duplicate|409/i.test(text) && res.status !== 409) throw new StorageError(`Couldn't create the storage bucket (${res.status}): ${text.slice(0, 200)}`)
  }
  bucketReady = true
}

const enc = (p: string) => p.split("/").map(encodeURIComponent).join("/")
const full = (p: string) => `${supabaseUrl}/storage/v1${p}`

/** A one-time URL (valid ~2 hours) the client can PUT the zip to. */
export async function signedUpload(path: string) {
  await ensureBucket()
  const res = await call(`/object/upload/sign/${BUCKET}/${enc(path)}`, { method: "POST", headers: { "x-upsert": "true" }, json: {} })
  if (!res.ok) throw new StorageError(`Couldn't prepare the upload (${res.status}): ${(await res.text()).slice(0, 200)}`)
  const { url } = (await res.json()) as { url: string }
  return full(url.startsWith("/") ? url : `/${url}`)
}

/** A temporary download link (1 hour). */
export async function signedDownload(path: string, filename: string) {
  const res = await call(`/object/sign/${BUCKET}/${enc(path)}`, { method: "POST", json: { expiresIn: 3600 } })
  if (!res.ok) throw new StorageError(`Couldn't create the download link (${res.status}): ${(await res.text()).slice(0, 200)}`)
  const { signedURL } = (await res.json()) as { signedURL: string }
  const sep = signedURL.includes("?") ? "&" : "?"
  return full(`${signedURL.startsWith("/") ? signedURL : `/${signedURL}`}${sep}download=${encodeURIComponent(filename)}`)
}

/** Size in bytes of an uploaded object, or null when it isn't there. */
export async function objectSize(path: string): Promise<number | null> {
  const res = await call(`/object/info/${BUCKET}/${enc(path)}`)
  if (!res.ok) return null
  const j = (await res.json()) as { size?: number; metadata?: { size?: number } }
  return j.size ?? j.metadata?.size ?? null
}

export async function removeObject(path: string) {
  await call(`/object/${BUCKET}`, { method: "DELETE", json: { prefixes: [path] } }).catch(() => {})
}
