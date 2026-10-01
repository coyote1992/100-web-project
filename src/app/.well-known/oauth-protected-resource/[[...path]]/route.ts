import { NextResponse } from "next/server"
import { SCOPE, origin } from "@/lib/oauth"

/** RFC 9728: tells the client which authorization server protects /mcp. */
export function GET(req: Request) {
  const o = origin(req)
  return NextResponse.json(
    { resource: `${o}/mcp`, authorization_servers: [o], scopes_supported: [SCOPE], bearer_methods_supported: ["header"], resource_name: "Hundred" },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } },
  )
}
