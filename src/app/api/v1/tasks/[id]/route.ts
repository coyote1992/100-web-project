import { z } from "zod"
import { json, route } from "@/lib/api"
import { deleteTask, setTaskDone } from "@/lib/domain"

export const PATCH = route(
  async (req, ctx: RouteContext<"/api/v1/tasks/[id]">) => {
    const { done } = await json(req, z.object({ done: z.boolean() }))
    const t = await setTaskDone((await ctx.params).id, done)
    return { ok: true, id: t.id, done: !!t.doneAt }
  },
  { write: true },
)

export const DELETE = route(
  async (_req, ctx: RouteContext<"/api/v1/tasks/[id]">) => {
    await deleteTask((await ctx.params).id)
    return { ok: true }
  },
  { write: true },
)
