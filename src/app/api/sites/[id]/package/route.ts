import { NextResponse } from "next/server"
import { DomainError, packageLink } from "@/lib/domain"

/** Sends the browser to a short-lived download link for the site's zip. */
export async function GET(_req: Request, ctx: RouteContext<"/api/sites/[id]/package">) {
  const { id } = await ctx.params
  try {
    const { url } = await packageLink(id)
    return NextResponse.redirect(url)
  } catch (e) {
    if (e instanceof DomainError) return NextResponse.json({ error: e.message }, { status: e.status ?? 400 })
    throw e
  }
}
