import { z } from "zod"
import { appUrl, dateString, json, route, taskList } from "@/lib/api"
import { addTask } from "@/lib/domain"

export const GET = route(async (req) => ({ tasks: await taskList(appUrl(req)) }))

export const POST = route(
  async (req) => {
    const b = await json(req, z.object({ siteId: z.string().uuid().optional(), title: z.string().min(1), note: z.string().optional(), dueAt: dateString.optional() }))
    const t = await addTask({ ...b, source: "chatgpt" })
    return { ok: true, id: t.id }
  },
  { write: true },
)
