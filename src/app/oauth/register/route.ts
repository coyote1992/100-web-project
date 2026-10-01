import { NextResponse } from "next/server"
import { newId, oauthEnabled, redirectAllowed } from "@/lib/oauth"

const cors = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" }

export const OPTIONS = () => new Response(null, { status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } })

/** Dynamic client registration (RFC 7591). Clients are public; the redirect allowlist is what matters. */
export async function POST(req: Request) {
  if (!oauthEnabled()) return NextResponse.json({ error: "server_error", error_description: "Set API_TOKEN or APP_PASSWORD on the server first." }, { status: 503, headers: cors })
  const body = (await req.json().catch(() => null)) as { redirect_uris?: unknown; client_name?: unknown } | null
  const uris = Array.isArray(body?.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === "string") : []
  if (!uris.length || !uris.every(redirectAllowed))
    return NextResponse.json({ error: "invalid_redirect_uri", error_description: "Redirect URIs must be ChatGPT's callback or a loopback address." }, { status: 400, headers: cors })
  return NextResponse.json(
    {
      client_id: `hundred_${newId()}`,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: typeof body?.client_name === "string" ? body.client_name.slice(0, 80) : "MCP client",
      redirect_uris: uris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: "hundred",
    },
    { status: 201, headers: cors },
  )
}
