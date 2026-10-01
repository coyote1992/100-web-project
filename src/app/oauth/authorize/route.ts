import { NextResponse } from "next/server"
import { CODE_TTL, SCOPE, newId, oauthEnabled, origin, ownerPassword, redirectAllowed, safeEqual, sign } from "@/lib/oauth"

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

type Params = { client_id: string; redirect_uri: string; state: string; code_challenge: string; resource: string; scope: string }

function read(src: URLSearchParams | FormData): Params & { response_type: string; method: string } {
  const g = (k: string) => String(src.get(k) ?? "")
  return {
    client_id: g("client_id"),
    redirect_uri: g("redirect_uri"),
    state: g("state"),
    code_challenge: g("code_challenge"),
    method: g("code_challenge_method"),
    response_type: g("response_type"),
    resource: g("resource"),
    scope: g("scope"),
  }
}

/** Problems with the request itself are shown here, never redirected to an unverified URI. */
function validate(p: ReturnType<typeof read>) {
  if (!oauthEnabled()) return "The server has no API_TOKEN or APP_PASSWORD set, so it can't sign anyone in."
  if (p.response_type !== "code") return "Only the authorization code flow is supported."
  if (!p.client_id) return "Missing client_id."
  if (!redirectAllowed(p.redirect_uri)) return "That redirect address isn't allowed. Only ChatGPT and local clients can connect."
  if (!p.code_challenge || p.method !== "S256") return "PKCE with S256 is required."
  return null
}

function page(p: ReturnType<typeof read>, opts: { error?: string; fatal?: string }) {
  const hidden = (Object.entries({ client_id: p.client_id, redirect_uri: p.redirect_uri, state: p.state, code_challenge: p.code_challenge, code_challenge_method: p.method, response_type: p.response_type, resource: p.resource, scope: p.scope }) as [string, string][])
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`)
    .join("")
  const body = opts.fatal
    ? `<h1>Can't connect</h1><p class="err">${esc(opts.fatal)}</p>`
    : `<h1>Connect to Hundred</h1>
       <p>An assistant is asking to read and update your Hundred app: sites, emails, tasks and templates. Enter your password to allow it.</p>
       <form method="post">${hidden}
         <label for="pw">Password</label>
         <input id="pw" name="password" type="password" autocomplete="current-password" autofocus required>
         ${opts.error ? `<p class="err" role="alert">${esc(opts.error)}</p>` : ""}
         <button type="submit">Allow access</button>
       </form>
       <p class="fine">You can cut access any time by changing API_TOKEN on the server.</p>`
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Connect to Hundred</title>
<style>
:root{color-scheme:light dark;--bg:#faf8f4;--fg:#2a2620;--mut:#6f685d;--line:#e3ded5;--card:#fffefb;--amber:#e7a13c}
@media(prefers-color-scheme:dark){:root{--bg:#1c1a17;--fg:#efebe3;--mut:#a39b8d;--line:#35312b;--card:#24211d}}
*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:20px;background:var(--bg);color:var(--fg);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
main{width:100%;max-width:400px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:28px}
h1{font:400 2rem/1.1 "Iowan Old Style","Palatino Linotype",Georgia,serif;margin:0 0 12px}p{margin:0 0 16px;color:var(--mut)}
label{display:block;font-size:13px;margin-bottom:6px}input[type=password]{width:100%;height:40px;padding:0 12px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--fg);font:inherit}
input:focus-visible{outline:2px solid var(--amber);outline-offset:2px}button{margin-top:16px;width:100%;height:40px;border:0;border-radius:9px;background:var(--fg);color:var(--bg);font:inherit;font-weight:500;cursor:pointer}
button:active{transform:scale(.98)}.err{color:#b4412f;margin:10px 0 0}.fine{font-size:13px;margin:16px 0 0}::selection{background:color-mix(in oklch,var(--amber) 40%,transparent)}
</style></head><body><main>${body}</main></body></html>`,
    { status: opts.fatal ? 400 : 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY", "content-security-policy": "frame-ancestors 'none'" } },
  )
}

export function GET(req: Request) {
  const p = read(new URL(req.url).searchParams)
  const fatal = validate(p)
  return page(p, fatal ? { fatal } : {})
}

export async function POST(req: Request) {
  const form = await req.formData()
  const p = read(form)
  const fatal = validate(p)
  if (fatal) return page(p, { fatal })

  const pw = String(form.get("password") ?? "")
  if (!ownerPassword() || !safeEqual(pw, ownerPassword())) {
    await new Promise((r) => setTimeout(r, 900)) // slows guessing
    return page(p, { error: "That password isn't right." })
  }

  const o = origin(req)
  const aud = p.resource.startsWith(o) ? p.resource : `${o}/mcp`
  const code = sign({ typ: "code", iss: o, aud, scope: SCOPE, exp: Math.floor(Date.now() / 1000) + CODE_TTL, jti: newId(), cid: p.client_id, ru: p.redirect_uri, cc: p.code_challenge })
  const target = new URL(p.redirect_uri)
  target.searchParams.set("code", code)
  if (p.state) target.searchParams.set("state", p.state)
  target.searchParams.set("iss", o)
  return NextResponse.redirect(target, 303)
}
