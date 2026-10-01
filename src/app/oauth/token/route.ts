import { NextResponse } from "next/server"
import { ACCESS_TTL, REFRESH_TTL, SCOPE, oauthEnabled, origin, pkceOk, redeemCode, sign, verify } from "@/lib/oauth"

const headers = { "Cache-Control": "no-store", Pragma: "no-cache", "Access-Control-Allow-Origin": "*" }
const fail = (error: string, description: string, status = 400) => NextResponse.json({ error, error_description: description }, { status, headers })

export const OPTIONS = () => new Response(null, { status: 204, headers: { ...headers, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } })

export async function POST(req: Request) {
  if (!oauthEnabled()) return fail("server_error", "Server has no signing secret configured.", 503)
  const form = new URLSearchParams(await req.text())
  const o = origin(req)
  const now = Math.floor(Date.now() / 1000)
  const issue = (aud: string, refresh?: string) =>
    NextResponse.json(
      {
        access_token: sign({ typ: "access", iss: o, aud, scope: SCOPE, exp: now + ACCESS_TTL, sub: "owner" }),
        token_type: "Bearer",
        expires_in: ACCESS_TTL,
        refresh_token: refresh ?? sign({ typ: "refresh", iss: o, aud, scope: SCOPE, exp: now + REFRESH_TTL, sub: "owner" }),
        scope: SCOPE,
      },
      { headers },
    )

  const grant = form.get("grant_type")
  if (grant === "authorization_code") {
    const c = verify(form.get("code") ?? "", "code")
    if (!c || c.iss !== o) return fail("invalid_grant", "The code is invalid or has expired.")
    if (form.get("redirect_uri") !== c.ru) return fail("invalid_grant", "redirect_uri doesn't match the authorization request.")
    if (form.get("client_id") && form.get("client_id") !== c.cid) return fail("invalid_grant", "client_id doesn't match the authorization request.")
    if (!pkceOk(form.get("code_verifier") ?? "", String(c.cc))) return fail("invalid_grant", "PKCE verification failed.")
    if (!(await redeemCode(String(c.jti)))) return fail("invalid_grant", "This code was already used.")
    return issue(c.aud)
  }
  if (grant === "refresh_token") {
    const c = verify(form.get("refresh_token") ?? "", "refresh")
    if (!c || c.iss !== o) return fail("invalid_grant", "The refresh token is invalid or has expired.")
    return issue(c.aud, form.get("refresh_token") ?? undefined)
  }
  return fail("unsupported_grant_type", "Use authorization_code or refresh_token.")
}
