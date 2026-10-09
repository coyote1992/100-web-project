import { NextResponse } from "next/server"
import { DomainError, packageLink } from "@/lib/domain"

/** Sends the browser to a short-lived download link: /api/packages/site/<id>?file=<package id>. */
export async function GET(req: Request, ctx: RouteContext<"/api/packages/[kind]/[id]">) {
  const { kind, id } = await ctx.params
  if (kind !== "site" && kind !== "vertical") return NextResponse.json({ error: "Unknown kind." }, { status: 404 })
  try {
    const { url } = await packageLink({ kind, id }, new URL(req.url).searchParams.get("file") ?? undefined)
    return NextResponse.redirect(url)
  } catch (e) {
    if (e instanceof DomainError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
