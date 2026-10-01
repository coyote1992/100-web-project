import "server-only"
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { getDb, schema } from "@/db"

/**
 * A minimal single-owner OAuth 2.1 server, just enough for ChatGPT's "Connect" flow:
 * authorization code + PKCE (S256), public clients, dynamic registration, refresh tokens.
 * Tokens are signed (HS256) and stateless; the only thing stored is which codes were used.
 *
 * The owner proves who they are with APP_PASSWORD (or API_TOKEN when no password is set).
 * Changing API_TOKEN / APP_PASSWORD invalidates every issued token.
 */

export const SCOPE = "hundred"
export const ACCESS_TTL = 12 * 3600
export const CODE_TTL = 300
export const REFRESH_TTL = 180 * 86400

const signingSecret = () => process.env.API_TOKEN ?? process.env.APP_PASSWORD ?? ""
export const ownerPassword = () => process.env.APP_PASSWORD ?? process.env.API_TOKEN ?? ""
export const oauthEnabled = () => !!signingSecret()

const key = () => createHash("sha256").update(`hundred-oauth|${signingSecret()}`).digest()
const b64 = (x: string | Buffer) => Buffer.from(x).toString("base64url")

type Typ = "code" | "access" | "refresh"
export type Claims = { typ: Typ; iss: string; aud: string; exp: number; iat: number; scope: string; [k: string]: unknown }

export function sign(claims: Omit<Claims, "iat">): string {
  const body = { ...claims, iat: Math.floor(Date.now() / 1000) }
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payload = b64(JSON.stringify(body))
  const sig = createHmac("sha256", key()).update(`${head}.${payload}`).digest("base64url")
  return `${head}.${payload}.${sig}`
}

export function verify(token: string, typ: Typ): Claims | null {
  if (!oauthEnabled()) return null
  const [head, payload, sig] = token.split(".")
  if (!head || !payload || !sig) return null
  const expected = createHmac("sha256", key()).update(`${head}.${payload}`).digest()
  const given = Buffer.from(sig, "base64url")
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const c = JSON.parse(Buffer.from(payload, "base64url").toString()) as Claims
    if (c.typ !== typ || typeof c.exp !== "number" || c.exp < Date.now() / 1000) return null
    return c
  } catch {
    return null
  }
}

export function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest()
  const hb = createHash("sha256").update(b).digest()
  return timingSafeEqual(ha, hb)
}

/** Where authorization codes may be sent: ChatGPT's callback, or a loopback address for CLI clients such as Codex. */
const REDIRECTS = [
  /^https:\/\/(chatgpt\.com|chat\.openai\.com)\/connector_platform_oauth_redirect$/,
  /^https:\/\/(chatgpt\.com|chat\.openai\.com)\/connector\/oauth\/[\w-]+$/,
  /^https:\/\/(chatgpt\.com|chat\.openai\.com)\/aip\/[\w-]+\/oauth\/callback$/,
  /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/[\w\-./]*)?$/,
]
export const redirectAllowed = (uri: string) => REDIRECTS.some((r) => r.test(uri))

export function pkceOk(verifier: string, challenge: string) {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false
  return safeEqual(createHash("sha256").update(verifier).digest("base64url"), challenge)
}

export const newId = () => b64(randomBytes(12))

/** Codes are single-use: remember the ones that were redeemed. */
export async function redeemCode(jti: string) {
  const db = await getDb()
  const rows = await db
    .insert(schema.settings)
    .values({ key: `oauth_code:${jti}`, value: String(Date.now()) })
    .onConflictDoNothing()
    .returning({ key: schema.settings.key })
  return rows.length === 1
}

export function origin(req: Request) {
  const u = new URL(req.url)
  const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "")
  return `${proto}://${req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host}`
}

/** Bearer check for the MCP endpoint: an OAuth access token, or the static API_TOKEN. */
export function bearerValid(req: Request) {
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim()
  if (!given) return false
  const staticToken = process.env.API_TOKEN
  if (staticToken && safeEqual(given, staticToken)) return true
  const c = verify(given, "access")
  if (!c) return false
  const o = origin(req)
  return c.aud === o || c.aud === `${o}/mcp`
}
