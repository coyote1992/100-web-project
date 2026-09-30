import { z } from "zod"
import { json, route } from "@/lib/api"
import { addExtract } from "@/lib/domain"
import { EXTRACT_KINDS } from "@/lib/flow"

const body = z.object({
  kind: z.enum(EXTRACT_KINDS),
  text: z.string().min(1),
  messageId: z.string().uuid().optional(),
})

export const POST = route(
  async (req, ctx: RouteContext<"/api/v1/sites/[id]/extracts">) => {
    const { id } = await ctx.params
    const b = await json(req, z.union([z.object({ extracts: z.array(body).min(1).max(50) }), body]))
    const list = "extracts" in b ? b.extracts : [b]
    const results = []
    for (const e of list) results.push(await addExtract(id, e.kind, e.text, e.messageId))
    return { ok: true, results }
  },
  { write: true },
)
