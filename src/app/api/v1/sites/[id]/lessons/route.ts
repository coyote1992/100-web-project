import { z } from "zod"
import { json, route } from "@/lib/api"
import { addLesson } from "@/lib/domain"

export const POST = route(
  async (req, ctx: RouteContext<"/api/v1/sites/[id]/lessons">) => {
    const { id } = await ctx.params
    const { body } = await json(req, z.object({ body: z.string().min(1) }))
    return { ok: true, ...(await addLesson(id, body)) }
  },
  { write: true },
)
