import { NextResponse, type NextRequest } from "next/server"

/** Optional basic-auth gate: set APP_PASSWORD to require it. The ChatGPT API has its own bearer token. */
export function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD
  if (!password) return NextResponse.next()
  const header = req.headers.get("authorization") ?? ""
  const [scheme, encoded] = header.split(" ")
  if (scheme === "Basic" && encoded) {
    const decoded = atob(encoded)
    if (decoded.slice(decoded.indexOf(":") + 1) === password) return NextResponse.next()
  }
  return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Hundred", charset="UTF-8"' } })
}

export const config = {
  // The plugin endpoints sign callers in themselves (OAuth or bearer token), so the basic-auth gate skips them.
  matcher: ["/((?!api/v1|mcp|oauth|\\.well-known|_next/static|_next/image|favicon.ico).*)"],
}
