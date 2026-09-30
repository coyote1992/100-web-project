import { route } from "@/lib/api"
import { deleteExtract } from "@/lib/domain"

export const DELETE = route(
  async (_req, ctx: RouteContext<"/api/v1/extracts/[id]">) => {
    await deleteExtract((await ctx.params).id)
    return { ok: true }
  },
  { write: true },
)
