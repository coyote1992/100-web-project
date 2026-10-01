import { z } from "zod"
import { revalidatePath } from "next/cache"
import { DomainError } from "@/lib/domain"
import { SERVER_INSTRUCTIONS } from "@/lib/guide"
import { SCOPE, bearerValid, oauthEnabled, origin } from "@/lib/oauth"
import { TOOLS } from "@/lib/tools"

/**
 * The Hundred plugin's MCP server: stateless Streamable HTTP, JSON replies.
 * initialize / tools/list are open (they describe the tools, nothing more);
 * tools/call needs an OAuth access token from /oauth, or the static API_TOKEN.
 */

const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
}

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> }

const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result })
const err = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } })

const schemes = [{ type: "oauth2", scopes: [SCOPE] }]

function describeTools() {
  return TOOLS.map((t) => {
    const inputSchema = z.toJSONSchema(t.input, { io: "input" }) as Record<string, unknown>
    delete inputSchema.$schema
    return {
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema,
      annotations: { title: t.title, readOnlyHint: !!t.readOnly, destructiveHint: !!t.destructive, idempotentHint: !!(t.readOnly || t.idempotent), openWorldHint: false },
      securitySchemes: schemes,
      _meta: { securitySchemes: schemes },
    }
  })
}

async function callTool(req: Request, params: Record<string, unknown> | undefined) {
  const tool = TOOLS.find((t) => t.name === params?.name)
  if (!tool) return { isError: true, content: [{ type: "text", text: `Unknown tool "${String(params?.name)}".` }] }
  try {
    const args = tool.input.parse(params?.arguments ?? {})
    const data = await tool.run(args as never, { base: origin(req) })
    if (!tool.readOnly) revalidatePath("/", "layout")
    const structured = Array.isArray(data) ? { items: data } : (data as Record<string, unknown>)
    return { content: [{ type: "text", text: JSON.stringify(structured) }], structuredContent: structured }
  } catch (e) {
    const text =
      e instanceof DomainError
        ? e.message
        : e instanceof z.ZodError
          ? "Invalid arguments: " + e.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ")
          : "Something went wrong on the server."
    if (!(e instanceof DomainError) && !(e instanceof z.ZodError)) console.error(e)
    return { isError: true, content: [{ type: "text", text }] }
  }
}

/** The sign-in challenge ChatGPT looks for: a tool result carrying mcp/www_authenticate. */
function challenge(req: Request, id: Rpc["id"]) {
  const header = `Bearer resource_metadata="${origin(req)}/.well-known/oauth-protected-resource", scope="${SCOPE}"`
  const body = ok(id, {
    isError: true,
    content: [{ type: "text", text: oauthEnabled() ? "Authentication required. Sign in to Hundred to continue." : "The server has no API_TOKEN or APP_PASSWORD set, so nobody can sign in yet." }],
    _meta: { "mcp/www_authenticate": [header] },
  })
  return { body, header }
}

async function handle(req: Request, msg: Rpc, authed: boolean): Promise<{ body: unknown; header?: string } | null> {
  const isNotification = msg.id === undefined
  switch (msg.method) {
    case "initialize": {
      const asked = String(msg.params?.protocolVersion ?? "")
      return {
        body: ok(msg.id, {
          protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "hundred", title: "Hundred", version: "1.0.0" },
          instructions: SERVER_INSTRUCTIONS,
        }),
      }
    }
    case "ping":
      return { body: ok(msg.id, {}) }
    case "tools/list":
      return { body: ok(msg.id, { tools: describeTools() }) }
    case "tools/call": {
      if (!authed) return challenge(req, msg.id)
      return { body: ok(msg.id, await callTool(req, msg.params)) }
    }
    case "resources/list":
      return { body: ok(msg.id, { resources: [] }) }
    case "prompts/list":
      return { body: ok(msg.id, { prompts: [] }) }
    default:
      if (isNotification) return null
      return { body: err(msg.id, -32601, `Method not found: ${msg.method}`) }
  }
}

export const OPTIONS = () => new Response(null, { status: 204, headers: cors })

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null)
  if (!raw) return Response.json(err(null, -32700, "Parse error"), { status: 400, headers: cors })
  const batch = Array.isArray(raw)
  const authed = bearerValid(req)
  const replies: unknown[] = []
  let header: string | undefined
  for (const m of (batch ? raw : [raw]) as Rpc[]) {
    if (!m || m.jsonrpc !== "2.0" || typeof m.method !== "string") {
      replies.push(err(null, -32600, "Invalid request"))
      continue
    }
    const out = await handle(req, m, authed)
    if (out) {
      replies.push(out.body)
      header ??= out.header
    }
  }
  if (!replies.length) return new Response(null, { status: 202, headers: cors })
  return Response.json(batch ? replies : replies[0], { headers: { ...cors, "Cache-Control": "no-store", ...(header ? { "WWW-Authenticate": header } : {}) } })
}

/** Stateless server: no SSE stream to open, no session to close. */
export const GET = () => new Response("This MCP server speaks Streamable HTTP over POST.", { status: 405, headers: { ...cors, Allow: "POST, OPTIONS" } })
export const DELETE = () => new Response(null, { status: 405, headers: { ...cors, Allow: "POST, OPTIONS" } })
